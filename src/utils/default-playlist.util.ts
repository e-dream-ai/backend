import { User } from "entities";
import appDataSource from "database/app-data-source";
import { DefaultPlaylist } from "entities/DefaultPlaylist.entity";
import { getTopDreams } from "./dream.util";
import { VoteType } from "types/vote.types";

/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);
const defaultPlaylistRepository = appDataSource.getRepository(DefaultPlaylist);

/**
 *@param {User} user
 *@param {string[]} topDreams
 * @returns void
 */
export const computeUserDefaultPlaylist = async (
  user: User,
  topDreams: string[],
) => {
  const DEFAULT_PLAYLIST_SIZE = 20;
  /**
   * filter user downvotes
   */
  const userDownvotes = user.votes
    .filter((vote) => vote.vote === VoteType.DOWNVOTE)
    .map((vote) => vote?.dream?.uuid ?? "");

  /**
   * remove downvotes from
   */
  const filteredTopDreams = topDreams.filter(
    (item) => !userDownvotes.includes(item),
  );

  const playlistData: string[] = filteredTopDreams.slice(
    0,
    DEFAULT_PLAYLIST_SIZE,
  );

  let playlist = await defaultPlaylistRepository.findOne({
    where: { user: { id: user.id } },
  });

  if (playlist) {
    // Update existing default playlist
    playlist.data = playlistData;
  } else {
    // Create new default playlist
    playlist = defaultPlaylistRepository.create({
      user: user,
      data: playlistData,
    });
  }

  await defaultPlaylistRepository.save(playlist);
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
      await computeUserDefaultPlaylist(user, topDreams);
    }

    offset += users.length;

    // If the last batch is smaller than the BATCH_SIZE, stop processing
    if (users.length < BATCH_SIZE) {
      break;
    }
  }
};
