import appDataSource from "database/app-data-source";
import { Dream, Playlist, User } from "entities";
/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);
const dreamRepository = appDataSource.getRepository(Dream);
const playlistRepository = appDataSource.getRepository(Playlist);

export const setUserCurrentDream = async (
  user: User,
  uuid?: string,
  persist = true,
) => {
  const dreamExists = await dreamRepository.findOne({
    where: { uuid },
  });

  if (!dreamExists) return;

  if (persist) {
    await userRepository.update(user?.id, { currentDream: dreamExists });
  }

  return dreamExists;
};

export const setUserCurrentPlaylist = async (
  user: User,
  playlistId?: number,
) => {
  const playlistExists = await playlistRepository.findOne({
    where: { id: playlistId },
  });

  if (!playlistExists) return;

  await userRepository.update(user?.id, { currentPlaylist: playlistExists });

  return playlistExists;
};

export const removeUserCurrentPlaylist = async (user: User) => {
  await userRepository.update(user?.id, { currentPlaylist: null });
};
