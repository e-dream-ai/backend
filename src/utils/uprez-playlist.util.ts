import { Dream, Playlist, PlaylistItem, User } from "entities";
import {
  dreamRepository,
  playlistItemRepository,
  playlistRepository,
} from "database/repositories";
import { DreamStatusType } from "types/dream.types";
import { PlaylistItemType } from "types/playlist.types";
import { APP_LOGGER } from "shared/logger";
import { UprezPlaylistPromptJson } from "./playlist-prompt.util";
import { parsePromptJson } from "./prompt.util";
import { processDreamRequest } from "./dream.util";
import {
  bulkDeletePlaylistItemsAndResetOrder,
  linkPlaylistKeyframes,
  refreshPlaylistUpdatedAtTimestamp,
} from "./playlist.util";
import { cancelJobAcrossQueues } from "./job-cancel.util";

export interface RunUprezPlaylistResult {
  created: number;
  requeued: number;
  kept: number;
  removed: number;
  skipped: number;
  linked: number;
}

const getSourceDreamUuid = (dream: Dream | null | undefined): string | null => {
  if (!dream) return null;
  const parsed = parsePromptJson(dream);
  const value = parsed?.source_dream_uuid;
  return typeof value === "string" ? value : null;
};

const getOrderedDreamItems = (playlistId: number): Promise<PlaylistItem[]> =>
  playlistItemRepository.find({
    where: { playlist: { id: playlistId }, type: PlaylistItemType.DREAM },
    relations: { dreamItem: { startKeyframe: true, endKeyframe: true } },
    order: { order: "ASC" },
  });

export const runUprezPlaylist = async ({
  playlist,
  prompt,
  userId,
}: {
  playlist: Pick<Playlist, "id" | "uuid">;
  prompt: UprezPlaylistPromptJson;
  userId: number;
}): Promise<RunUprezPlaylistResult> => {
  const dreamAlgorithm = prompt.dream_algorithm ?? "uprez";
  const params = prompt.params ?? {};

  const source = await playlistRepository.findOne({
    where: { uuid: prompt.source_playlist_uuid },
    select: { id: true, uuid: true },
  });

  if (!source) {
    throw new Error(
      `Source playlist ${prompt.source_playlist_uuid} not found for uprez playlist ${playlist.uuid}`,
    );
  }

  const sourceItems = await getOrderedDreamItems(source.id);
  const sourceDreams = sourceItems
    .map((item) => item.dreamItem)
    .filter((dream): dream is Dream => Boolean(dream));

  const sourceUuidSet = new Set(sourceDreams.map((dream) => dream.uuid));
  const sourceOrder = new Map<string, number>();
  sourceDreams.forEach((dream, index) => sourceOrder.set(dream.uuid, index));
  const firstSource = sourceDreams[0];
  const lastSource = sourceDreams[sourceDreams.length - 1];
  const loop = Boolean(
    firstSource?.startKeyframe?.uuid &&
      lastSource?.endKeyframe?.uuid &&
      lastSource.endKeyframe.uuid === firstSource.startKeyframe.uuid,
  );

  const derivedItems = await getOrderedDreamItems(playlist.id);
  const existingBySource = new Map<string, PlaylistItem>();
  const itemsToRemove: number[] = [];

  for (const item of derivedItems) {
    const srcUuid = getSourceDreamUuid(item.dreamItem);
    if (!srcUuid) {
      continue;
    }
    if (!sourceUuidSet.has(srcUuid)) {
      itemsToRemove.push(item.id);
    } else {
      existingBySource.set(srcUuid, item);
    }
  }

  const result: RunUprezPlaylistResult = {
    created: 0,
    requeued: 0,
    kept: 0,
    removed: itemsToRemove.length,
    skipped: 0,
    linked: 0,
  };

  if (itemsToRemove.length > 0) {
    await bulkDeletePlaylistItemsAndResetOrder({
      playlistId: playlist.id,
      itemIdsToDelete: itemsToRemove,
    });
  }

  const userRef = { id: userId } as User;
  const requeuedDreams: Dream[] = [];
  const newDreams: Dream[] = [];
  const newDreamOrders: number[] = [];

  for (const sourceDream of sourceDreams) {
    if (sourceDream.status !== DreamStatusType.PROCESSED) {
      result.skipped += 1;
      continue;
    }

    const existing = existingBySource.get(sourceDream.uuid);

    if (existing?.dreamItem) {
      if (existing.dreamItem.status === DreamStatusType.FAILED) {
        existing.dreamItem.status = DreamStatusType.QUEUE;
        existing.dreamItem.error = null;
        requeuedDreams.push(existing.dreamItem);
        result.requeued += 1;
      } else {
        result.kept += 1;
      }
      continue;
    }

    const uprezDream = new Dream();
    uprezDream.name = `${sourceDream.name ?? "dream"} (uprez)`;
    uprezDream.user = userRef;
    uprezDream.status = DreamStatusType.QUEUE;
    uprezDream.prompt = JSON.stringify({
      ...params,
      infinidream_algorithm: dreamAlgorithm,
      video_uuid: sourceDream.uuid,
      source_dream_uuid: sourceDream.uuid,
    });
    newDreams.push(uprezDream);
    newDreamOrders.push(sourceOrder.get(sourceDream.uuid) ?? 0);
    result.created += 1;
  }

  const dreamsToEnqueue: Dream[] = [];

  if (requeuedDreams.length > 0) {
    await dreamRepository.save(requeuedDreams);
    dreamsToEnqueue.push(...requeuedDreams);
  }

  if (newDreams.length > 0) {
    const savedDreams = await dreamRepository.save(newDreams);
    const newItems = savedDreams.map((dream, index) => {
      const item = new PlaylistItem();
      item.playlist = { id: playlist.id } as Playlist;
      item.type = PlaylistItemType.DREAM;
      item.dreamItem = dream;
      item.order = newDreamOrders[index];
      return item;
    });
    await playlistItemRepository.save(newItems);
    dreamsToEnqueue.push(...savedDreams);
  }

  const finalItems = await getOrderedDreamItems(playlist.id);
  const srcUuidByItemId = new Map<number, string | null>(
    finalItems.map((item) => [item.id, getSourceDreamUuid(item.dreamItem)]),
  );
  const orderedManaged = finalItems
    .filter((item) => srcUuidByItemId.get(item.id) !== null)
    .sort((a, b) => {
      const orderA = sourceOrder.get(srcUuidByItemId.get(a.id)!) ?? 0;
      const orderB = sourceOrder.get(srcUuidByItemId.get(b.id)!) ?? 0;
      return orderA - orderB;
    });
  const unmanaged = finalItems.filter(
    (item) => srcUuidByItemId.get(item.id) === null,
  );
  const ordered = [...orderedManaged, ...unmanaged];

  await Promise.all(
    ordered
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.order !== index)
      .map(({ item, index }) =>
        playlistItemRepository.update(item.id, { order: index }),
      ),
  );

  for (const dream of dreamsToEnqueue) {
    try {
      await processDreamRequest(dream);
    } catch (error) {
      APP_LOGGER.error(
        `Failed to enqueue uprez job for dream ${dream.uuid} in playlist ${playlist.uuid}:`,
        error,
      );
    }
  }

  result.linked = await linkPlaylistKeyframes({
    playlistId: playlist.id,
    userId,
    loop,
    clear: true,
  });

  await refreshPlaylistUpdatedAtTimestamp(playlist.id);

  APP_LOGGER.info(
    `Ran uprez playlist ${playlist.uuid}: ${JSON.stringify(result)}`,
  );

  return result;
};

export const cancelUprezPlaylist = async (
  playlistId: number,
): Promise<{ cancelled: number }> => {
  const items = await playlistItemRepository.find({
    where: { playlist: { id: playlistId }, type: PlaylistItemType.DREAM },
    relations: { dreamItem: true },
  });

  const outcomes = await Promise.all(
    items.map(async (item) => {
      const dream = item.dreamItem;
      if (!dream || getSourceDreamUuid(dream) === null) return false;
      try {
        const cancelResult = await cancelJobAcrossQueues(dream.uuid);
        if (!cancelResult.jobFound) return false;
        if (dream.status !== DreamStatusType.PROCESSED) {
          await dreamRepository.update(
            { uuid: dream.uuid },
            { status: DreamStatusType.FAILED, error: "Cancelled by user" },
          );
        }
        return true;
      } catch (error) {
        APP_LOGGER.error(
          `Failed to cancel uprez job for dream ${dream.uuid}:`,
          error,
        );
        return false;
      }
    }),
  );

  return { cancelled: outcomes.filter(Boolean).length };
};
