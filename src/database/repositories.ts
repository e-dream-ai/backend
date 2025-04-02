import appDataSource from "database/app-data-source";
import {
  User,
  Role,
  Dream,
  FeedItem,
  Keyframe,
  Playlist,
  PlaylistItem,
  PlaylistKeyframe,
  DefaultPlaylist,
  Vote,
  ReportType,
  Report,
  Feature,
  Invite,
  ApiKey,
} from "entities";

export const userRepository = appDataSource.getRepository(User);
export const roleRepository = appDataSource.getRepository(Role);
export const apiKeyRepository = appDataSource.getRepository(ApiKey);
export const dreamRepository = appDataSource.getRepository(Dream);
export const keyframeRepository = appDataSource.getRepository(Keyframe);
export const playlistRepository = appDataSource.getRepository(Playlist);
export const defaultPlaylistRepository =
  appDataSource.getRepository(DefaultPlaylist);
export const playlistItemRepository = appDataSource.getRepository(PlaylistItem);
export const playlistKeyframeRepository =
  appDataSource.getRepository(PlaylistKeyframe);
export const voteRepository = appDataSource.getRepository(Vote);
export const reportTypeRepository = appDataSource.getRepository(ReportType);
export const reportRepository = appDataSource.getRepository(Report);
export const feedItemRepository = appDataSource.getRepository(FeedItem);
export const inviteRepository = appDataSource.getRepository(Invite);
export const featureRepository = appDataSource.getRepository(Feature);

export default {
  userRepository,
  roleRepository,
  apiKeyRepository,
  dreamRepository,
  keyframeRepository,
  playlistRepository,
  defaultPlaylistRepository,
  playlistItemRepository,
  playlistKeyframeRepository,
  voteRepository,
  reportTypeRepository,
  reportRepository,
  feedItemRepository,
  featureRepository,
};
