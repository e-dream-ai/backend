import { Dream, User, Playlist, Keyframe } from "entities";
import { FeedItem } from "entities/FeedItem.entity";
import { PlaylistItem, PlaylistKeyframe } from "entities";
import { generateSignedUrlFromObjectKey } from "./r2.util";
import type { Frame } from "./r2.util";

// Simple LRU cache for signed URLs to reduce redundant API calls
class SignedUrlCache {
  private cache = new Map<string, { url: string; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttlMinutes: number = 15) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.url;
  }

  set(key: string, url: string): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { url, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const signedUrlCache = new SignedUrlCache();

/**
 * Cached wrapper for generateSignedUrlFromObjectKey
 */
const generateSignedUrlFromObjectKeyCached = async (
  objectKey: string,
): Promise<string | null> => {
  const cached = signedUrlCache.get(objectKey);
  if (cached !== null) {
    return cached;
  }

  const signedUrl = await generateSignedUrlFromObjectKey(objectKey);
  if (signedUrl !== null) {
    signedUrlCache.set(objectKey, signedUrl);
  }
  return signedUrl;
};

/**
 * Generates signed URLs for filmstrip frames with caching and throttled concurrency
 * @param {string[] | Frame[] | null} filmstrip - filmstrip data
 * @param {number} concurrency - max concurrent URL generations (default: 25)
 * @returns {Promise<Frame[] | null>} filmstrip with signed URLs
 */
const generateFilmstripSignedUrlsWithCache = async (
  filmstrip: string[] | Frame[] | null | undefined,
  concurrency: number = 25,
): Promise<Frame[] | null> => {
  if (!filmstrip || !Array.isArray(filmstrip)) return null;

  const results: Frame[] = [];
  for (let i = 0; i < filmstrip.length; i += concurrency) {
    const chunk = filmstrip
      .slice(i, i + concurrency)
      .map(async (frame, index) => {
        const absoluteIndex = i + index;
        if (typeof frame === "string") {
          const signedUrl = await generateSignedUrlFromObjectKeyCached(frame);
          return signedUrl
            ? { frameNumber: absoluteIndex + 1, url: signedUrl }
            : null;
        } else if (frame && typeof frame === "object" && "url" in frame) {
          const signedUrl = await generateSignedUrlFromObjectKeyCached(
            frame.url,
          );
          return signedUrl
            ? { frameNumber: frame.frameNumber, url: signedUrl }
            : null;
        }
        return null;
      });

    const partial = (await Promise.all(chunk)).filter(
      (f): f is Frame => f !== null,
    );
    results.push(...partial);
  }

  return results.length > 0 ? results : null;
};

/**
 * Memory usage monitoring utility
 */
export const logMemoryUsage = (context: string): void => {
  const usage = process.memoryUsage();
  console.log(`[${context}] Memory Usage:`, {
    rss: `${Math.round((usage.rss / 1024 / 1024) * 100) / 100} MB`,
    heapTotal: `${Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100} MB`,
    heapUsed: `${Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100} MB`,
    external: `${Math.round((usage.external / 1024 / 1024) * 100) / 100} MB`,
    cacheSize: signedUrlCache.size(),
  });
};

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
    dream.video = await generateSignedUrlFromObjectKeyCached(dream.video);
  }

  // Transform original video URL
  if (dream.original_video) {
    dream.original_video = await generateSignedUrlFromObjectKeyCached(
      dream.original_video,
    );
  }

  // Transform thumbnail URL
  if (dream.thumbnail) {
    dream.thumbnail = await generateSignedUrlFromObjectKeyCached(
      dream.thumbnail,
    );
  }

  // Transform filmstrip URLs (cached + throttled)
  if (dream.filmstrip) {
    const signedFilmstrip = await generateFilmstripSignedUrlsWithCache(
      dream.filmstrip,
    );
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
    user.avatar = await generateSignedUrlFromObjectKeyCached(user.avatar);
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
    playlist.thumbnail = await generateSignedUrlFromObjectKeyCached(
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
    keyframe.image = await generateSignedUrlFromObjectKeyCached(keyframe.image);
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
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of Dream entities with signed URLs
 */
export const transformDreamsWithSignedUrls = async (
  dreams: Dream[],
  batchSize: number = 50,
): Promise<Dream[]> => {
  logMemoryUsage(`transformDreams start - ${dreams.length} items`);
  const results: Dream[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < dreams.length; i += batchSize) {
    const batch = dreams.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((dream) => transformDreamWithSignedUrls(dream)),
    );
    results.push(...batchResults);

    // Log progress for large datasets
    if (dreams.length > 100 && (i + batchSize) % 200 === 0) {
      logMemoryUsage(`transformDreams batch ${Math.floor(i / batchSize) + 1}`);
    }

    // Optional: Force garbage collection if available (for debugging)
    if (global.gc && process.env.NODE_ENV === "development") {
      global.gc();
    }
  }

  logMemoryUsage(`transformDreams complete - ${results.length} items`);
  return results;
};

/**
 * Transforms an array of User entities by converting object keys to signed URLs
 * @param users - Array of User entities with object keys
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of User entities with signed URLs
 */
export const transformUsersWithSignedUrls = async (
  users: User[],
  batchSize: number = 50,
): Promise<User[]> => {
  const results: User[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((user) => transformUserWithSignedUrls(user)),
    );
    results.push(...batchResults);
  }

  return results;
};

/**
 * Transforms an array of Playlist entities by converting object keys to signed URLs
 * @param playlists - Array of Playlist entities with object keys
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of Playlist entities with signed URLs
 */
export const transformPlaylistsWithSignedUrls = async (
  playlists: Playlist[],
  batchSize: number = 50,
): Promise<Playlist[]> => {
  const results: Playlist[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < playlists.length; i += batchSize) {
    const batch = playlists.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((playlist) => transformPlaylistWithSignedUrls(playlist)),
    );
    results.push(...batchResults);
  }

  return results;
};

/**
 * Transforms an array of Keyframe entities by converting object keys to signed URLs
 * @param keyframes - Array of Keyframe entities with object keys
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of Keyframe entities with signed URLs
 */
export const transformKeyframesWithSignedUrls = async (
  keyframes: Keyframe[],
  batchSize: number = 50,
): Promise<Keyframe[]> => {
  const results: Keyframe[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < keyframes.length; i += batchSize) {
    const batch = keyframes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((keyframe) => transformKeyframeWithSignedUrls(keyframe)),
    );
    results.push(...batchResults);
  }

  return results;
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
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of FeedItem entities with signed URLs
 */
export const transformFeedItemsWithSignedUrls = async (
  feedItems: FeedItem[],
  batchSize: number = 50,
): Promise<FeedItem[]> => {
  logMemoryUsage(`transformFeedItems start - ${feedItems.length} items`);
  const results: FeedItem[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < feedItems.length; i += batchSize) {
    const batch = feedItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((feedItem) => transformFeedItemWithSignedUrls(feedItem)),
    );
    results.push(...batchResults);

    // Log progress for large datasets
    if (feedItems.length > 100 && (i + batchSize) % 200 === 0) {
      logMemoryUsage(
        `transformFeedItems batch ${Math.floor(i / batchSize) + 1}`,
      );
    }
  }

  logMemoryUsage(`transformFeedItems complete - ${results.length} items`);
  return results;
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
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of PlaylistItem entities with signed URLs
 */
export const transformPlaylistItemsWithSignedUrls = async (
  playlistItems: PlaylistItem[],
  batchSize: number = 50,
): Promise<PlaylistItem[]> => {
  const results: PlaylistItem[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < playlistItems.length; i += batchSize) {
    const batch = playlistItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item) => transformPlaylistItemWithSignedUrls(item)),
    );
    results.push(...batchResults);
  }

  return results;
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
 * @param batchSize - Number of items to process concurrently (default: 50)
 * @returns Array of PlaylistKeyframe entities with signed URLs
 */
export const transformPlaylistKeyframesWithSignedUrls = async (
  playlistKeyframes: PlaylistKeyframe[],
  batchSize: number = 50,
): Promise<PlaylistKeyframe[]> => {
  const results: PlaylistKeyframe[] = [];

  // Process in batches to limit memory usage and concurrent operations
  for (let i = 0; i < playlistKeyframes.length; i += batchSize) {
    const batch = playlistKeyframes.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((keyframe) =>
        transformPlaylistKeyframeWithSignedUrls(keyframe),
      ),
    );
    results.push(...batchResults);
  }

  return results;
};
