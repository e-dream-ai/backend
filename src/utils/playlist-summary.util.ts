import type { PlaylistProgress } from "types/job-progress.types";
import { Playlist, PlaylistItem } from "entities";
import { playlistItemRepository } from "database/repositories";
import { DreamMediaType, DreamStatusType } from "types/dream.types";
import {
  GetPlaylistFilterOptions,
  getVisiblePlaylistItemsForThumbnail,
  PlaylistThumbnailCandidate,
} from "./playlist.util";
import { framesToSeconds } from "./video.utils";

type ProgressBucket = "completed" | "failed" | "idle" | "queued" | "inProgress";

const QUERY_BATCH_SIZE = 200;

const PROGRESS_BUCKETS = new Map<string, ProgressBucket>([
  [DreamStatusType.PROCESSED, "completed"],
  [DreamStatusType.FAILED, "failed"],
  [DreamStatusType.NONE, "idle"],
  [DreamStatusType.QUEUE, "queued"],
  [DreamStatusType.PROCESSING, "inProgress"],
]);

export const populatePlaylistThumbnails = async (
  playlists: Playlist[],
  filter: GetPlaylistFilterOptions,
): Promise<void> => {
  for (const nsfw of [false, true]) {
    const states = playlists
      .filter(
        (playlist) =>
          !playlist.thumbnail && Boolean(playlist.nsfw && filter.nsfw) === nsfw,
      )
      .map((playlist) => ({
        playlist,
        stack: [{ id: playlist.id, index: 0 }],
        visited: new Set([playlist.id]),
      }));
    const candidates = new Map<number, PlaylistThumbnailCandidate[]>();
    while (states.some((state) => state.stack.length > 0)) {
      const missing = new Set<number>();
      for (const state of states) {
        while (state.stack.length > 0) {
          const frame = state.stack[state.stack.length - 1];
          const items = candidates.get(frame.id);
          if (!items) {
            missing.add(frame.id);
            break;
          }
          const item = items[frame.index++];
          if (!item) {
            state.stack.pop();
            continue;
          }
          const thumbnail =
            item.dreamItem?.thumbnail || item.playlistItem?.thumbnail;
          if (thumbnail) {
            state.playlist.thumbnail = thumbnail;
            state.stack.length = 0;
            break;
          }
          const child = item.playlistItem;
          if (child && !state.visited.has(child.id)) {
            state.visited.add(child.id);
            state.stack.push({ id: child.id, index: 0 });
          }
        }
      }
      const ids = [...missing];
      for (let offset = 0; offset < ids.length; offset += 200) {
        const batch = ids.slice(offset, offset + 200);
        const items = await getVisiblePlaylistItemsForThumbnail(batch, {
          ...filter,
          nsfw,
          onlyProcessedDreams: true,
        });
        for (const id of batch) candidates.set(id, []);
        for (const item of items) candidates.get(item.playlist.id)!.push(item);
      }
    }
  }
};

export interface PlaylistTotals {
  totalDurationSeconds: number;
  totalDreamCount: number;
  progress: PlaylistProgress;
}

const emptyTotals = (): PlaylistTotals => ({
  totalDurationSeconds: 0,
  totalDreamCount: 0,
  progress: {
    total: 0,
    completed: 0,
    queued: 0,
    inProgress: 0,
    failed: 0,
    idle: 0,
    remaining: 0,
  },
});

const queryPlaylistItems = (
  playlistIds: number[],
  filter: GetPlaylistFilterOptions,
): Promise<PlaylistItem[]> => {
  const query = playlistItemRepository
    .createQueryBuilder("item")
    .select("item.id")
    .leftJoin("item.playlist", "parent")
    .addSelect("parent.id")
    .leftJoin("item.dreamItem", "dream")
    .addSelect([
      "dream.id",
      "dream.processedVideoFrames",
      "dream.activityLevel",
      "dream.status",
      "dream.mediaType",
    ])
    .leftJoin("item.playlistItem", "nested")
    .addSelect("nested.id")
    .where("item.playlistId IN (:...ids)", { ids: playlistIds });

  if (filter.nsfw === false) {
    query
      .andWhere("(dream.nsfw = false OR dream.nsfw IS NULL)")
      .andWhere("(nested.nsfw = false OR nested.nsfw IS NULL)");
  }
  if (!filter.isAdmin) {
    query
      .andWhere(
        "(dream.hidden = false OR dream.hidden IS NULL OR dream.userId = :userId)",
        { userId: filter.userId },
      )
      .andWhere(
        "(nested.hidden = false OR nested.hidden IS NULL OR nested.userId = :userId)",
      );
  }

  return query.getMany();
};

export const computePlaylistTotalsBatch = async (
  playlistIds: readonly number[],
  filter: GetPlaylistFilterOptions,
): Promise<Map<number, PlaylistTotals>> => {
  const totals = new Map<number, PlaylistTotals>();
  const visited = new Map<number, Set<number>>();
  const countedDreams = new Map<number, Set<number>>();

  for (const rootId of playlistIds) {
    if (!rootId || totals.has(rootId)) continue;
    totals.set(rootId, emptyTotals());
    visited.set(rootId, new Set([rootId]));
    countedDreams.set(rootId, new Set());
  }

  let frontier = new Map<number, Set<number>>(
    [...totals.keys()].map((rootId) => [rootId, new Set([rootId])]),
  );

  while (frontier.size > 0) {
    const ids = [...frontier.keys()];
    const next = new Map<number, Set<number>>();

    for (let offset = 0; offset < ids.length; offset += QUERY_BATCH_SIZE) {
      const items = await queryPlaylistItems(
        ids.slice(offset, offset + QUERY_BATCH_SIZE),
        filter,
      );

      for (const item of items) {
        const roots = item.playlist?.id
          ? frontier.get(item.playlist.id)
          : undefined;
        if (!roots) continue;

        const dream = item.dreamItem;
        const nested = item.playlistItem;

        for (const rootId of roots) {
          const rootTotals = totals.get(rootId)!;

          if (dream) {
            if (dream.processedVideoFrames && dream.activityLevel) {
              rootTotals.totalDurationSeconds += framesToSeconds(
                dream.processedVideoFrames,
                dream.activityLevel,
              );
            }
            if (
              dream.status === DreamStatusType.PROCESSED &&
              dream.mediaType !== DreamMediaType.IMAGE
            ) {
              rootTotals.totalDreamCount++;
            }

            const counted = countedDreams.get(rootId)!;
            if (!counted.has(dream.id)) {
              counted.add(dream.id);
              rootTotals.progress.total++;
              const bucket = PROGRESS_BUCKETS.get(dream.status);
              if (bucket) rootTotals.progress[bucket]++;
            }
          }

          if (nested) {
            const seen = visited.get(rootId)!;
            if (seen.has(nested.id)) continue;
            seen.add(nested.id);
            const pendingRoots = next.get(nested.id) ?? new Set<number>();
            pendingRoots.add(rootId);
            next.set(nested.id, pendingRoots);
          }
        }
      }
    }

    frontier = next;
  }

  for (const { progress } of totals.values()) {
    progress.remaining = progress.queued + progress.inProgress;
  }

  return totals;
};

export const computePlaylistTotals = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
): Promise<PlaylistTotals> => {
  const totals = await computePlaylistTotalsBatch([playlistId], filter);
  return totals.get(playlistId) ?? emptyTotals();
};

export const attachPlaylistProgress = async <T extends { id: number }>(
  playlists: ReadonlyArray<T | null | undefined>,
  filter: GetPlaylistFilterOptions,
): Promise<void> => {
  const present = playlists.filter((playlist): playlist is T =>
    Boolean(playlist?.id),
  );
  if (!present.length) return;

  const totals = await computePlaylistTotalsBatch(
    present.map(({ id }) => id),
    filter,
  );
  for (const playlist of present) {
    Object.assign(playlist, { progress: totals.get(playlist.id)?.progress });
  }
};
