import { Playlist, PlaylistItem } from "entities";
import { playlistItemRepository } from "database/repositories";
import { DreamMediaType, DreamStatusType } from "types/dream.types";
import {
  GetPlaylistFilterOptions,
  getVisiblePlaylistItemsForThumbnail,
  PlaylistThumbnailCandidate,
} from "./playlist.util";
import { framesToSeconds } from "./video.utils";

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
}

export const computePlaylistTotals = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
): Promise<PlaylistTotals> => {
  const totals: PlaylistTotals = {
    totalDurationSeconds: 0,
    totalDreamCount: 0,
  };
  const visited = new Set<number>();
  let pending = playlistId ? [playlistId] : [];
  while (pending.length > 0) {
    const current = pending;
    for (const id of current) visited.add(id);
    const next = new Set<number>();
    for (let offset = 0; offset < current.length; offset += 200) {
      const query = playlistItemRepository
        .createQueryBuilder("item")
        .select("item.id")
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
        .where("item.playlistId IN (:...ids)", {
          ids: current.slice(offset, offset + 200),
        });
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
      const items: PlaylistItem[] = await query.getMany();
      for (const item of items) {
        const dream = item.dreamItem;
        if (dream?.processedVideoFrames && dream.activityLevel) {
          totals.totalDurationSeconds += framesToSeconds(
            dream.processedVideoFrames,
            dream.activityLevel,
          );
        }
        if (
          dream?.status === DreamStatusType.PROCESSED &&
          dream.mediaType !== DreamMediaType.IMAGE
        ) {
          totals.totalDreamCount++;
        }
        const nestedId = item.playlistItem?.id;
        if (nestedId && !visited.has(nestedId)) next.add(nestedId);
      }
    }
    pending = [...next];
  }
  return totals;
};
