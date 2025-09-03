import { Playlist, User } from "entities";
import appDataSource from "database/app-data-source";
import { DefaultPlaylist } from "entities/DefaultPlaylist.entity";
import { getTopDreams } from "./dream.util";
import { VoteType } from "types/vote.types";
// import { DEFAULT_PLAYLIST_SIZE } from "constants/playlist.constants";
import { PlaylistItemType } from "types/playlist.types";
import env from "shared/env";

/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);
const playlistRepository = appDataSource.getRepository(Playlist);
const defaultPlaylistRepository = appDataSource.getRepository(DefaultPlaylist);

/**
 *@param {userId} userId
 * @returns void
 */
export const computeDefaultPlaylistFromUserId = async (userId: number) => {
  const topDreams = await getTopDreams();
  const user = await userRepository.findOne({
    where: {
      id: userId,
    },
    relations: {
      votes: {
        dream: true,
      },
    },
  });

  return computeUserDefaultPlaylist(user!, topDreams);
};

/**
 *@param {User} user
 *@param {string[]} topDreams
 * @returns Promise<DefaultPlaylist>
 */
export const computeUserDefaultPlaylist = async (
  user: User,
  topDreams: string[],
) => {
  const designedPlaylist = await playlistRepository.findOne({
    where: {
      uuid: env.DESIGNED_PLAYLIST_UUID,
    },
    relations: {
      items: {
        playlistItem: true,
        dreamItem: true,
      },
    },
    order: {
      items: {
        order: "ASC",
      },
    },
  });

  /**
   * dreams from designed playlist uuids
   */
  const designedPlaylistUUIDS =
    designedPlaylist?.items
      ?.filter((item) => item.type === PlaylistItemType.DREAM)
      .map((item) => item?.dreamItem!.uuid) ?? [];

  /**
   * dreams user downvotes uuids
   */
  const userDownvotesUUIDS = user.votes
    .filter((vote) => vote.vote === VoteType.DOWNVOTE)
    .map((vote) => vote?.dream?.uuid ?? "");

  let defaultPlaylist = [...designedPlaylistUUIDS, ...topDreams];

  /**
   * remove downvotes from defaultPlaylist
   */
  defaultPlaylist = defaultPlaylist.filter(
    (item) => !userDownvotesUUIDS.includes(item),
  );

  /**
   * remove duplicates from defaultPlaylist
   */
  defaultPlaylist = defaultPlaylist.filter(
    (item, index) => defaultPlaylist.indexOf(item) === index,
  );
  /**
   * take only DEFAULT_PLAYLIST_SIZE number of items
   */
  // .slice(0, DEFAULT_PLAYLIST_SIZE);

  let playlist = await defaultPlaylistRepository.findOne({
    where: { user: { id: user.id } },
  });

  if (playlist) {
    // Update existing default playlist
    playlist.data = defaultPlaylist;
  } else {
    // Create new default playlist
    playlist = defaultPlaylistRepository.create({
      user: user,
      data: defaultPlaylist,
    });
  }

  return await defaultPlaylistRepository.save(playlist);
};

/**
 * @returns void
 */
export const computeAllUsersDefaultPlaylist = async () => {
  const topDreams = await getTopDreams();

  // size of each batch
  const BATCH_SIZE = 100;

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [users] = await userRepository.findAndCount({
      relations: {
        votes: {
          dream: true,
        },
      },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (users.length === 0) {
      break; // Break the loop if no more users are found
    }

    for (const user of users) {
      await computeUserDefaultPlaylist(user, [...topDreams]);
    }

    offset += users.length;

    // If the last batch is smaller than the BATCH_SIZE, stop processing
    if (users.length < BATCH_SIZE) {
      break;
    }
  }
};

/**
 * Removes a deleted dream UUID from all default playlists
 * This should be called when a dream is deleted to maintain data consistency
 * @param dreamUuid - UUID of the deleted dream
 * @returns void
 */
export const removeDeletedDreamFromDefaultPlaylists = async (
  dreamUuid: string,
) => {
  try {
    // Find all default playlists that contain this dream UUID
    const defaultPlaylists = await defaultPlaylistRepository.find();

    const playlistsToUpdate: DefaultPlaylist[] = [];

    for (const playlist of defaultPlaylists) {
      if (playlist.data && playlist.data.includes(dreamUuid)) {
        playlist.data = playlist.data.filter((uuid) => uuid !== dreamUuid);
        playlistsToUpdate.push(playlist);
      }
    }

    if (playlistsToUpdate.length > 0) {
      await defaultPlaylistRepository.save(playlistsToUpdate);
      console.log(
        `Removed dream ${dreamUuid} from ${playlistsToUpdate.length} default playlists`,
      );
    }
  } catch (error) {
    console.error(
      `Error removing deleted dream ${dreamUuid} from default playlists:`,
      error,
    );
    // Don't throw the error to avoid disrupting the main deletion flow
  }
};
