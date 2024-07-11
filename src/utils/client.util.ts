import appDataSource from "database/app-data-source";
import { Dream, Playlist } from "entities";
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
  name: dream?.name,
  artist: dream?.displayedOwner?.name ?? dream?.user?.name,
  size: dream?.processedVideoSize,
  status: dream?.status,
  fps: dream?.processedVideoFPS,
  frames: dream?.processedVideoFrames,
  thumbnail: dream?.thumbnail,
  upvotes: dream?.upvotes,
  downvotes: dream?.downvotes,
  nsfw: dream?.nsfw,
  frontendUrl: dream?.frontendUrl,
  activityLevel: dream?.activityLevel,
  video_timestamp: dream?.processed_at?.getTime(),
  timestamp: dream?.updated_at?.getTime(),
});

/**
 *@param {Playlist} dream
 * @returns {ClientPlaylist} clientDream
 */
export const formatClientPlaylist = (playlist: Playlist): ClientPlaylist => ({
  id: playlist.id,
  name: playlist?.name,
  artist: playlist?.displayedOwner?.name ?? playlist?.user?.name,
  thumbnail: playlist?.thumbnail,
  nsfw: playlist?.nsfw,
  contents: playlist?.items
    ?.filter((item) => Boolean(item?.dreamItem))
    .map((item) => ({
      uuid: item?.dreamItem?.uuid,
      timestamp: item?.dreamItem?.updated_at?.getTime(),
    })),
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
