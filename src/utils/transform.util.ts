import { Dream, User, Playlist, Keyframe } from "entities";
import { FeedItem } from "entities/FeedItem.entity";
import { PlaylistItem, PlaylistKeyframe } from "entities";
import {
  generateSignedUrlFromObjectKey,
  generateFilmstripSignedUrls,
} from "./r2.util";

/**
 * Transforms a Dream entity by converting object keys to signed URLs
 * @param dream - Dream entity with object keys
 * @returns Dream entity with signed URLs
 */
export const transformDreamWithSignedUrls = async (
  dream: Dream,
): Promise<Dream> => {
  // Transform video URL
  if (dream.video) {
    dream.video = await generateSignedUrlFromObjectKey(dream.video);
  }

  // Transform original video URL
  if (dream.original_video) {
    dream.original_video = await generateSignedUrlFromObjectKey(
      dream.original_video,
    );
  }

  // Transform thumbnail URL
  if (dream.thumbnail) {
    dream.thumbnail = await generateSignedUrlFromObjectKey(dream.thumbnail);
  }

  // Transform filmstrip URLs
  if (dream.filmstrip) {
    const signedFilmstrip = await generateFilmstripSignedUrls(dream.filmstrip);
    dream.filmstrip = signedFilmstrip || [];
  }

  // Transform nested user entities
  if (dream.user) {
    dream.user = await transformUserWithSignedUrls(dream.user);
  }

  if (dream.displayedOwner) {
    dream.displayedOwner = await transformUserWithSignedUrls(
      dream.displayedOwner,
    );
  }

  // Transform nested keyframes
  if (dream.startKeyframe) {
    dream.startKeyframe = await transformKeyframeWithSignedUrls(
      dream.startKeyframe,
    );
  }

  if (dream.endKeyframe) {
    dream.endKeyframe = await transformKeyframeWithSignedUrls(
      dream.endKeyframe,
    );
  }

  return dream;
};

/**
 * Transforms a User entity by converting object keys to signed URLs
 * @param user - User entity with object keys
 * @returns User entity with signed URLs
 */
export const transformUserWithSignedUrls = async (
  user: User,
): Promise<User> => {
  // Transform avatar URL
  if (user.avatar) {
    user.avatar = await generateSignedUrlFromObjectKey(user.avatar);
  }

  return user;
};

/**
 * Transforms a Playlist entity by converting object keys to signed URLs
 * @param playlist - Playlist entity with object keys
 * @returns Playlist entity with signed URLs
 */
export const transformPlaylistWithSignedUrls = async (
  playlist: Playlist,
): Promise<Playlist> => {
  // Transform thumbnail URL
  if (playlist.thumbnail) {
    playlist.thumbnail = await generateSignedUrlFromObjectKey(
      playlist.thumbnail,
    );
  }

  // Transform nested user entities
  if (playlist.user) {
    playlist.user = await transformUserWithSignedUrls(playlist.user);
  }

  if (playlist.displayedOwner) {
    playlist.displayedOwner = await transformUserWithSignedUrls(
      playlist.displayedOwner,
    );
  }

  // Transform nested dream and playlist items
  if (playlist.items) {
    playlist.items = await Promise.all(
      playlist.items.map(async (item) => {
        if (item.dreamItem) {
          item.dreamItem = await transformDreamWithSignedUrls(item.dreamItem);
        }

        if (item.playlistItem) {
          item.playlistItem = await transformPlaylistWithSignedUrls(
            item.playlistItem,
          );
        }

        return item;
      }),
    );
  }

  return playlist;
};

/**
 * Transforms a Keyframe entity by converting object keys to signed URLs
 * @param keyframe - Keyframe entity with object keys
 * @returns Keyframe entity with signed URLs
 */
export const transformKeyframeWithSignedUrls = async (
  keyframe: Keyframe,
): Promise<Keyframe> => {
  // Transform image URL
  if (keyframe.image) {
    keyframe.image = await generateSignedUrlFromObjectKey(keyframe.image);
  }

  // Transform nested user entities
  if (keyframe.user) {
    keyframe.user = await transformUserWithSignedUrls(keyframe.user);
  }

  if (keyframe.displayedOwner) {
    keyframe.displayedOwner = await transformUserWithSignedUrls(
      keyframe.displayedOwner,
    );
  }

  return keyframe;
};

/**
 * Transforms an array of Dream entities by converting object keys to signed URLs
 * @param dreams - Array of Dream entities with object keys
 * @returns Array of Dream entities with signed URLs
 */
export const transformDreamsWithSignedUrls = async (
  dreams: Dream[],
): Promise<Dream[]> => {
  return Promise.all(
    dreams.map((dream) => transformDreamWithSignedUrls(dream)),
  );
};

/**
 * Transforms an array of User entities by converting object keys to signed URLs
 * @param users - Array of User entities with object keys
 * @returns Array of User entities with signed URLs
 */
export const transformUsersWithSignedUrls = async (
  users: User[],
): Promise<User[]> => {
  return Promise.all(users.map((user) => transformUserWithSignedUrls(user)));
};

/**
 * Transforms an array of Playlist entities by converting object keys to signed URLs
 * @param playlists - Array of Playlist entities with object keys
 * @returns Array of Playlist entities with signed URLs
 */
export const transformPlaylistsWithSignedUrls = async (
  playlists: Playlist[],
): Promise<Playlist[]> => {
  return Promise.all(
    playlists.map((playlist) => transformPlaylistWithSignedUrls(playlist)),
  );
};

/**
 * Transforms an array of Keyframe entities by converting object keys to signed URLs
 * @param keyframes - Array of Keyframe entities with object keys
 * @returns Array of Keyframe entities with signed URLs
 */
export const transformKeyframesWithSignedUrls = async (
  keyframes: Keyframe[],
): Promise<Keyframe[]> => {
  return Promise.all(
    keyframes.map((keyframe) => transformKeyframeWithSignedUrls(keyframe)),
  );
};

/**
 * Transforms a FeedItem entity by converting object keys to signed URLs
 * @param feedItem - FeedItem entity with object keys
 * @returns FeedItem entity with signed URLs
 */
export const transformFeedItemWithSignedUrls = async (
  feedItem: FeedItem,
): Promise<FeedItem> => {
  // Transform dream item if it exists
  if (feedItem.dreamItem) {
    feedItem.dreamItem = await transformDreamWithSignedUrls(feedItem.dreamItem);
  }

  // Transform playlist item if it exists
  if (feedItem.playlistItem) {
    feedItem.playlistItem = await transformPlaylistWithSignedUrls(
      feedItem.playlistItem,
    );
  }

  // Transform user if it exists
  if (feedItem.user) {
    feedItem.user = await transformUserWithSignedUrls(feedItem.user);
  }

  return feedItem;
};

/**
 * Transforms an array of FeedItem entities by converting object keys to signed URLs
 * @param feedItems - Array of FeedItem entities with object keys
 * @returns Array of FeedItem entities with signed URLs
 */
export const transformFeedItemsWithSignedUrls = async (
  feedItems: FeedItem[],
): Promise<FeedItem[]> => {
  return Promise.all(
    feedItems.map((feedItem) => transformFeedItemWithSignedUrls(feedItem)),
  );
};

/**
 * Transforms a PlaylistItem entity by converting object keys to signed URLs
 * @param playlistItem - PlaylistItem entity with object keys
 * @returns PlaylistItem entity with signed URLs
 */
export const transformPlaylistItemWithSignedUrls = async (
  playlistItem: PlaylistItem,
): Promise<PlaylistItem> => {
  // Transform dream item if it exists
  if (playlistItem.dreamItem) {
    playlistItem.dreamItem = await transformDreamWithSignedUrls(
      playlistItem.dreamItem,
    );
  }

  // Transform playlist item if it exists
  if (playlistItem.playlistItem) {
    playlistItem.playlistItem = await transformPlaylistWithSignedUrls(
      playlistItem.playlistItem,
    );
  }

  return playlistItem;
};

/**
 * Transforms an array of PlaylistItem entities by converting object keys to signed URLs
 * @param playlistItems - Array of PlaylistItem entities with object keys
 * @returns Array of PlaylistItem entities with signed URLs
 */
export const transformPlaylistItemsWithSignedUrls = async (
  playlistItems: PlaylistItem[],
): Promise<PlaylistItem[]> => {
  return Promise.all(
    playlistItems.map((item) => transformPlaylistItemWithSignedUrls(item)),
  );
};

/**
 * Transforms a PlaylistKeyframe entity by converting object keys to signed URLs
 * @param playlistKeyframe - PlaylistKeyframe entity with object keys
 * @returns PlaylistKeyframe entity with signed URLs
 */
export const transformPlaylistKeyframeWithSignedUrls = async (
  playlistKeyframe: PlaylistKeyframe,
): Promise<PlaylistKeyframe> => {
  // Transform keyframe if it exists
  if (playlistKeyframe.keyframe) {
    playlistKeyframe.keyframe = await transformKeyframeWithSignedUrls(
      playlistKeyframe.keyframe,
    );
  }

  return playlistKeyframe;
};

/**
 * Transforms an array of PlaylistKeyframe entities by converting object keys to signed URLs
 * @param playlistKeyframes - Array of PlaylistKeyframe entities with object keys
 * @returns Array of PlaylistKeyframe entities with signed URLs
 */
export const transformPlaylistKeyframesWithSignedUrls = async (
  playlistKeyframes: PlaylistKeyframe[],
): Promise<PlaylistKeyframe[]> => {
  return Promise.all(
    playlistKeyframes.map((keyframe) =>
      transformPlaylistKeyframeWithSignedUrls(keyframe),
    ),
  );
};
