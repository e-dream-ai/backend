import appDataSource from "database/app-data-source";
import { Dream, Playlist, PlaylistItem } from "entities";
import { In, IsNull } from "typeorm";
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
  md5: dream?.md5,
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
          // start_keyframe and end_keyframe will be skipped instead of sending null if dream doesn't have them
          // https://github.com/e-dream-ai/backend/issues/22#issuecomment-2649658596
          start_keyframe: item?.dreamItem?.startKeyframe?.uuid,
          end_keyframe: item?.dreamItem?.endKeyframe?.uuid,
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
    where: {
      uuid: In(uuids),
      deleted_at: IsNull(),
    },
    relations: { user: true, playlistItems: true },
    select: ["uuid", "updated_at"],
  });

  const orderedDreams = uuids
    .map((uuid) => dreams.find((d) => uuid === d.uuid))
    .filter((dream): dream is Dream => dream !== undefined);

  const clientDreams: PartialClientDream[] = orderedDreams.map((dream) => ({
    uuid: dream.uuid,
    timestamp: dream?.updated_at?.getTime(),
  }));

  return clientDreams;
};
