import appDataSource from "database/app-data-source";
import { Dream, Playlist, PlaylistItem } from "entities";
import { In } from "typeorm";
import {
  ClientDream,
  ClientPlaylist,
  PartialClientDream,
} from "types/client.types";

/**
 * Repositories
 */
const dreamRepository = appDataSource.getRepository(Dream);

/**
 *@param {Dream} dream
 * @returns {ClientDream} clientDream
 */
export const formatClientDream = (dream: Dream): ClientDream => ({
  uuid: dream.uuid,
  name: dream?.name ?? null,
  artist: dream?.displayedOwner?.name ?? dream?.user?.name ?? null,
  size: dream?.processedVideoSize ?? null,
  status: dream.status,
  fps: dream?.processedVideoFPS ?? null,
  frames: dream?.processedVideoFrames ?? null,
  thumbnail: dream?.thumbnail ?? null,
  upvotes: dream.upvotes,
  downvotes: dream.downvotes,
  nsfw: dream.nsfw,
  frontendUrl: dream.frontendUrl,
  activityLevel: dream?.activityLevel ?? null,
  video_timestamp: dream?.processed_at ? dream?.processed_at.getTime() : null,
  timestamp: dream.updated_at.getTime(),
});

/**
 * Flattens a nested structure of playlist items into a single array of dream items.
 * @param {PlaylistItem[]} playlistItems
 * @returns {Array<{uuid: string, timestamp: number}>} An array of flattened dream items
 */
const flattenPlaylistItems = (
  items: PlaylistItem[],
): Array<{ uuid: string; timestamp: number }> => {
  return items.flatMap((item) => {
    if (item.dreamItem) {
      return [
        {
          uuid: item.dreamItem.uuid,
          timestamp: item.dreamItem.updated_at.getTime(),
        },
      ];
    } else if (item.playlistItem) {
      // Recursively flatten nested playlist items
      return flattenPlaylistItems(item.playlistItem.items ?? []);
    }
    return [];
  });
};

/**
 *@param {Playlist} dream
 * @returns {ClientPlaylist} clientDream
 */
export const formatClientPlaylist = (playlist: Playlist): ClientPlaylist => ({
  id: playlist.id,
  name: playlist?.name ?? null,
  artist: playlist?.displayedOwner?.name ?? playlist?.user?.name ?? null,
  thumbnail: playlist?.thumbnail ?? null,
  nsfw: playlist.nsfw,
  contents: flattenPlaylistItems(playlist?.items ?? []),
  timestamp: playlist.updated_at.getTime(),
});

/**
 *
 * @param uuids dreams uuids
 * @returns {PartialClientDream[]} array of partial client dreams
 */
export const populateDefautPlaylist = async (
  uuids?: string[],
): Promise<PartialClientDream[]> => {
  if (!uuids) {
    return [];
  }

  const dreams = await dreamRepository.find({
    where: { uuid: In(uuids) },
    relations: { user: true, playlistItems: true },
    select: ["uuid", "updated_at"],
  });

  const clientDreams: PartialClientDream[] = dreams.map((dream) => ({
    uuid: dream.uuid,
    timestamp: dream?.updated_at?.getTime(),
  }));

  return clientDreams;
};
