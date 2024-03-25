import appDataSource from "database/app-data-source";
import { Dream, Playlist, User } from "entities";
/**
 * Repositories
 */
const userRepository = appDataSource.getRepository(User);
const dreamRepository = appDataSource.getRepository(Dream);
const playlistRepository = appDataSource.getRepository(Playlist);

export const setUserCurrentDream = async (user: User, uuid?: string) => {
  const dream = await dreamRepository.findOne({
    where: { uuid },
  });

  if (!dream) return;

  user.currentDream = dream;
  await userRepository.save(user);

  return dream;
};

export const setUserCurrentPlaylist = async (
  user: User,
  playlistId?: number,
) => {
  const playlist = await playlistRepository.findOne({
    where: { id: playlistId },
  });

  if (!playlist) return;

  user.currentPlaylist = playlist;
  await userRepository.save(user);

  return playlist;
};

export const removeUserCurrentPlaylist = async (user: User) => {
  user.currentPlaylist = null;
  await userRepository.save(user);
};
