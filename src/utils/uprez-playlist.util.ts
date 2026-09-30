import { isAdmin } from "./user.util";
import {
  Dream,
  Keyframe,
  Playlist,
  PlaylistItem,
  PlaylistKeyframe,
  User,
} from "entities";
import { EntityManager, In } from "typeorm";
import appDataSource from "database/app-data-source";
import { dreamRepository, playlistItemRepository } from "database/repositories";
import { DreamStatusType } from "types/dream.types";
import { PlaylistItemType } from "types/playlist.types";
import { APP_LOGGER } from "shared/logger";
import { UprezPlaylistPromptJson } from "./playlist-prompt.util";
import { mapAlgorithmToQueue, parsePromptJson } from "./prompt.util";
import {
  getSourceDreamUuid,
  IN_FLIGHT_STATUSES,
  planUprezRun,
  RunUprezPlaylistResult,
  UprezRunSummary,
} from "./uprez-plan.util";
import {
  failDreamWithError,
  processDreamRequest,
  QUEUE_FAILURE_MESSAGE,
} from "./dream.util";
import {
  bulkDeletePlaylistItemsAndResetOrder,
  refreshPlaylistUpdatedAtTimestamp,
} from "./playlist.util";
import {
  cancelJobAcrossQueues,
  cancelJobsByDreamUuids,
} from "./job-cancel.util";

export type {
  RunUprezPlaylistResult,
  UprezRunSummary,
} from "./uprez-plan.util";

const UPREZ_SETTINGS_CHANGED = "Cancelled: uprez settings changed";

export class UprezSourceAccessError extends Error {
  constructor() {
    super("Source playlist is unavailable");
    this.name = "UprezSourceAccessError";
  }
}

const canReadSource = (
  content: Pick<Playlist, "hidden" | "nsfw" | "userId">,
  user: User,
): boolean =>
  content.userId === user.id ||
  isAdmin(user) ||
  (!content.hidden && (!content.nsfw || user.nsfw));

const getOrderedDreamItems = (
  manager: EntityManager,
  playlistId: number,
): Promise<PlaylistItem[]> =>
  manager.find(PlaylistItem, {
    where: { playlist: { id: playlistId }, type: PlaylistItemType.DREAM },
    relations: { dreamItem: { startKeyframe: true, endKeyframe: true } },
    order: { order: "ASC" },
  });

const detectSourceLoop = (dreams: Dream[]): boolean => {
  const first = dreams[0];
  const last = dreams[dreams.length - 1];
  return Boolean(
    first?.startKeyframe?.uuid &&
      last?.endKeyframe?.uuid &&
      last.endKeyframe.uuid === first.startKeyframe.uuid,
  );
};

const linkUprezPlaylistKeyframes = async (
  manager: EntityManager,
  {
    playlistId,
    userId,
    loop,
  }: {
    playlistId: number;
    userId: number;
    loop: boolean;
  },
): Promise<number> => {
  const items = await manager.find(PlaylistItem, {
    where: { playlist: { id: playlistId }, type: PlaylistItemType.DREAM },
    relations: { dreamItem: true },
    order: { order: "ASC" },
  });
  const dreams = items
    .map((item) => item.dreamItem)
    .filter((dream): dream is Dream => Boolean(dream));

  if (dreams.length === 0) return 0;

  const existing = await manager.find(PlaylistKeyframe, {
    where: { playlist: { id: playlistId } },
  });
  if (existing.length > 0) await manager.softRemove(existing);

  const userRef = { id: userId } as User;
  const playlistRef = { id: playlistId } as Playlist;
  const keyframeNames = dreams.map(
    (dream, index) => `kf_${dream.name ?? index}`,
  );
  if (!loop) {
    const lastDream = dreams[dreams.length - 1];
    keyframeNames.push(`kf_end_${lastDream.name ?? dreams.length - 1}`);
  }

  const keyframes = await manager.save(
    keyframeNames.map((name) => {
      const keyframe = new Keyframe();
      keyframe.name = name;
      keyframe.user = userRef;
      return keyframe;
    }),
  );

  await manager.save(
    keyframes.map((keyframe, order) => {
      const playlistKeyframe = new PlaylistKeyframe();
      playlistKeyframe.playlist = playlistRef;
      playlistKeyframe.keyframe = keyframe;
      playlistKeyframe.order = order;
      return playlistKeyframe;
    }),
  );

  for (let offset = 0; offset < dreams.length; offset += 500) {
    const batch = dreams.slice(offset, offset + 500);
    await manager.query(
      `UPDATE dream AS dream
         SET "startKeyframeId" = links.start_id, "endKeyframeId" = links.end_id, updated_at = NOW()
         FROM unnest($1::int[], $2::int[], $3::int[]) AS links(id, start_id, end_id)
         WHERE dream.id = links.id AND dream.deleted_at IS NULL`,
      [
        batch.map((dream) => dream.id),
        batch.map((_, index) => keyframes[offset + index].id),
        batch.map(
          (_, index) =>
            (keyframes[offset + index + 1] ?? (loop ? keyframes[0] : null))
              ?.id ?? null,
        ),
      ],
    );
  }

  return dreams.length;
};

type UprezRunArgs = {
  playlist: Pick<Playlist, "id" | "uuid">;
  prompt: UprezPlaylistPromptJson;
  user: User;
};

const CANDIDATE_BATCH = 500;

/**
 * The runner's processed dreams of these sources that sit in no playlist:
 * mostly uprezes an earlier run swapped out. A dream still in another
 * playlist is left alone, since linking keyframes here would rewrite the
 * start/end keyframes that playlist relies on.
 *
 * Prompts are stored as JSON-encoded strings, so `prompt->>'…'` can't reach
 * inside them; a text match narrows the rows and the planner parses the rest.
 */
const findUprezCandidates = async (
  manager: EntityManager,
  userId: number,
  sourceUuids: string[],
): Promise<Dream[]> => {
  const candidates: Dream[] = [];
  for (let offset = 0; offset < sourceUuids.length; offset += CANDIDATE_BATCH) {
    const patterns = sourceUuids
      .slice(offset, offset + CANDIDATE_BATCH)
      .map((uuid) => `%${uuid}%`);
    candidates.push(
      ...(await manager
        .createQueryBuilder(Dream, "dream")
        .select(["dream.id", "dream.uuid", "dream.status", "dream.prompt"])
        .where("dream.userId = :userId", { userId })
        .andWhere("dream.status = :status", {
          status: DreamStatusType.PROCESSED,
        })
        .andWhere("dream.prompt::text LIKE '%source_dream_uuid%'")
        .andWhere("dream.prompt::text LIKE ANY(:patterns)", { patterns })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM playlist_item item
            WHERE item."dreamItemId" = dream.id AND item.deleted_at IS NULL)`,
        )
        .getMany()),
    );
  }
  return candidates;
};

const loadUprezRun = async (
  { playlist, prompt, user }: UprezRunArgs,
  manager: EntityManager = appDataSource.manager,
) => {
  const dreamAlgorithm = prompt.dream_algorithm ?? "uprez";
  const params = prompt.params ?? {};

  const source = await manager.findOne(Playlist, {
    where: { uuid: prompt.source_playlist_uuid },
    select: { id: true, uuid: true, userId: true, hidden: true, nsfw: true },
  });

  if (!source || !canReadSource(source, user)) {
    throw new UprezSourceAccessError();
  }

  const sourceItems = await getOrderedDreamItems(manager, source.id);
  const sourceDreams = sourceItems
    .map((item) => item.dreamItem)
    .filter((dream): dream is Dream => Boolean(dream));

  // Check every source before mutating the destination or queuing work.
  if (sourceDreams.some((dream) => !canReadSource(dream, user))) {
    throw new UprezSourceAccessError();
  }

  const derivedItems = await getOrderedDreamItems(manager, playlist.id);
  const candidates = await findUprezCandidates(
    manager,
    user.id,
    sourceDreams.map((dream) => dream.uuid),
  );

  const plan = planUprezRun({
    sourceDreams,
    derivedItems,
    candidates,
    dreamAlgorithm,
    params,
  });

  return { plan, sourceDreams, dreamAlgorithm, params };
};

/** What `runUprezPlaylist` would do with this prompt. Writes nothing. */
export const previewUprezPlaylist = async (
  args: UprezRunArgs,
): Promise<UprezRunSummary> => (await loadUprezRun(args)).plan.result;

const cancelReplacedJobs = async (dreams: Dream[]): Promise<void> => {
  const uuidsByQueue = new Map<string, string[]>();
  for (const dream of dreams) {
    const algorithm = parsePromptJson(dream)?.infinidream_algorithm;
    const queueName = algorithm ? mapAlgorithmToQueue(algorithm) : null;
    if (!queueName) continue;
    uuidsByQueue.set(queueName, [
      ...(uuidsByQueue.get(queueName) ?? []),
      dream.uuid,
    ]);
  }

  await Promise.all(
    [...uuidsByQueue].map(([queueName, uuids]) =>
      cancelJobsByDreamUuids(queueName, uuids).catch((error) =>
        APP_LOGGER.error(
          `Failed to cancel replaced uprez jobs in queue ${queueName}:`,
          error,
        ),
      ),
    ),
  );
};

const writeUprezRun = async (manager: EntityManager, args: UprezRunArgs) => {
  const { playlist, user } = args;

  await manager.query("SELECT pg_advisory_xact_lock(hashtext($1), $2)", [
    "uprez_run",
    user.id,
  ]);

  const { plan, sourceDreams, dreamAlgorithm, params } = await loadUprezRun(
    args,
    manager,
  );
  const { sourceOrder } = plan;

  if (plan.dreamsToCancel.length > 0) {
    await manager.update(
      Dream,
      {
        id: In(plan.dreamsToCancel.map((dream) => dream.id)),
        status: In(IN_FLIGHT_STATUSES),
      },
      { status: DreamStatusType.FAILED, error: UPREZ_SETTINGS_CHANGED },
    );
  }

  await bulkDeletePlaylistItemsAndResetOrder({
    playlistId: playlist.id,
    itemIdsToDelete: plan.itemIdsToRemove,
    manager,
  });

  const userRef = { id: user.id } as User;

  for (const dream of plan.dreamsToRequeue) {
    dream.status = DreamStatusType.QUEUE;
    dream.error = null;
  }
  const requeuedDreams =
    plan.dreamsToRequeue.length > 0
      ? await manager.save(plan.dreamsToRequeue)
      : [];

  const newDreams = plan.sourcesToCreate.map(({ source }) => {
    const uprezDream = new Dream();
    uprezDream.name = `${source.name ?? "dream"} (uprez)`;
    uprezDream.user = userRef;
    uprezDream.status = DreamStatusType.QUEUE;
    uprezDream.prompt = JSON.stringify({
      ...params,
      infinidream_algorithm: dreamAlgorithm,
      video_uuid: source.uuid,
      source_dream_uuid: source.uuid,
    });
    return uprezDream;
  });
  const savedDreams = newDreams.length > 0 ? await manager.save(newDreams) : [];

  const itemsToAdd = [
    ...savedDreams.map((dream, index) => ({
      dream,
      order: plan.sourcesToCreate[index].order,
    })),
    ...plan.dreamsToReuse,
  ];
  if (itemsToAdd.length > 0) {
    await manager.save(
      itemsToAdd.map(({ dream, order }) => {
        const item = new PlaylistItem();
        item.playlist = { id: playlist.id } as Playlist;
        item.type = PlaylistItemType.DREAM;
        item.dreamItem = dream;
        item.order = order;
        return item;
      }),
    );
  }

  const finalItems = await getOrderedDreamItems(manager, playlist.id);
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

  const changedOrders = ordered
    .map((item, order) => ({ id: item.id, previousOrder: item.order, order }))
    .filter((item) => item.previousOrder !== item.order);
  for (let offset = 0; offset < changedOrders.length; offset += 500) {
    const batch = changedOrders.slice(offset, offset + 500);
    await manager.query(
      `UPDATE playlist_item AS item SET "order" = positions.position, updated_at = NOW()
       FROM unnest($1::int[], $2::int[]) AS positions(id, position)
       WHERE item.id = positions.id AND item."playlistId" = $3 AND item.deleted_at IS NULL`,
      [
        batch.map((item) => item.id),
        batch.map((item) => item.order),
        playlist.id,
      ],
    );
  }

  const linked = await linkUprezPlaylistKeyframes(manager, {
    playlistId: playlist.id,
    userId: user.id,
    loop: detectSourceLoop(sourceDreams),
  });

  return {
    result: { ...plan.result, linked },
    dreamsToCancel: plan.dreamsToCancel,
    dreamsToEnqueue: [...requeuedDreams, ...savedDreams],
  };
};

export const runUprezPlaylist = async (
  args: UprezRunArgs,
): Promise<RunUprezPlaylistResult> => {
  const { playlist } = args;
  const { result, dreamsToCancel, dreamsToEnqueue } =
    await appDataSource.transaction((manager) => writeUprezRun(manager, args));

  await cancelReplacedJobs(dreamsToCancel);

  for (const dream of dreamsToEnqueue) {
    try {
      const queued = await processDreamRequest(dream, DreamStatusType.NONE);
      if (queued?.status === "failed") {
        await failDreamWithError(dream, QUEUE_FAILURE_MESSAGE);
      }
    } catch (error) {
      APP_LOGGER.error(
        `Failed to enqueue uprez job for dream ${dream.uuid} in playlist ${playlist.uuid}:`,
        error,
      );
    }
  }

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
