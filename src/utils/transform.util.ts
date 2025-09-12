import { presignClient } from "clients/presign.client";
import { Dream } from "entities/Dream.entity";
import { Keyframe } from "entities/Keyframe.entity";
import { Playlist } from "entities/Playlist.entity";
import { FeedItem } from "entities/FeedItem.entity";
import { User } from "entities/User.entity";
import { PlaylistItem } from "entities/PlaylistItem.entity";
import { PlaylistKeyframe } from "entities/PlaylistKeyframe";
import { Frame } from "types/dream.types";

interface FieldMapping {
  field: string;
  isFilmstrip?: boolean;
  isNested?: boolean;
  nestedPath?: string;
}

interface EntityConfig {
  readonly fields: readonly FieldMapping[];
  readonly nestedEntities?: readonly {
    readonly path: string;
    readonly entityType: keyof typeof ENTITY_CONFIGS;
  }[];
  readonly arrayEntities?: readonly {
    readonly path: string;
    readonly nestedPath?: string;
    readonly entityType: keyof typeof ENTITY_CONFIGS;
  }[];
}

const ENTITY_CONFIGS = {
  dream: {
    fields: [
      { field: "video" },
      { field: "original_video" },
      { field: "thumbnail" },
      { field: "filmstrip", isFilmstrip: true },
    ],
    nestedEntities: [
      { path: "user", entityType: "user" as const },
      { path: "displayedOwner", entityType: "user" as const },
    ],
    arrayEntities: [
      {
        path: "playlistItems",
        nestedPath: "playlist",
        entityType: "playlist" as const,
      },
    ],
  },
  keyframe: {
    fields: [{ field: "image" }],
    nestedEntities: [
      { path: "user", entityType: "user" as const },
      { path: "displayedOwner", entityType: "user" as const },
    ],
  },
  user: {
    fields: [{ field: "avatar" }],
  },
  playlist: {
    fields: [{ field: "thumbnail" }],
    nestedEntities: [
      { path: "user", entityType: "user" as const },
      { path: "displayedOwner", entityType: "user" as const },
    ],
  },
  playlistKeyframe: {
    fields: [],
    nestedEntities: [{ path: "keyframe", entityType: "keyframe" as const }],
  },
} as const;

class UnifiedTransformer {
  collectKeysFromEntity(
    entity: unknown,
    config: EntityConfig,
    visited = new Set<unknown>(),
  ): string[] {
    if (!entity || visited.has(entity)) return [];
    visited.add(entity);

    const keys: string[] = [];

    if (typeof entity !== "object" || entity === null) return [];

    const entityObj = entity as Record<string, unknown>;

    for (const mapping of config.fields) {
      const value = entityObj[mapping.field];

      if (mapping.isFilmstrip && Array.isArray(value)) {
        value.forEach((frame) => {
          if (
            typeof frame === "object" &&
            frame !== null &&
            "url" in frame &&
            typeof frame.url === "string"
          ) {
            keys.push(frame.url);
          }
        });
      } else if (value && typeof value === "string") {
        keys.push(value);
      }
    }

    if (config.nestedEntities) {
      for (const nested of config.nestedEntities) {
        const nestedEntity = entityObj[nested.path];
        if (nestedEntity) {
          const nestedConfig = ENTITY_CONFIGS[nested.entityType];
          keys.push(
            ...this.collectKeysFromEntity(nestedEntity, nestedConfig, visited),
          );
        }
      }
    }

    if (config.arrayEntities) {
      for (const arrayConfig of config.arrayEntities) {
        const arrayValue = entityObj[arrayConfig.path];
        if (Array.isArray(arrayValue)) {
          for (const item of arrayValue) {
            if (item && typeof item === "object") {
              const targetEntity = arrayConfig.nestedPath
                ? (item as Record<string, unknown>)[arrayConfig.nestedPath]
                : item;
              if (targetEntity) {
                const nestedConfig = ENTITY_CONFIGS[arrayConfig.entityType];
                keys.push(
                  ...this.collectKeysFromEntity(
                    targetEntity,
                    nestedConfig,
                    visited,
                  ),
                );
              }
            }
          }
        }
      }
    }

    return keys;
  }

  applySignedUrlsToEntity(
    entity: unknown,
    config: EntityConfig,
    signedUrls: Record<string, string>,
    visited = new Set<unknown>(),
  ): unknown {
    if (!entity || visited.has(entity)) return entity;
    visited.add(entity);

    if (typeof entity !== "object" || entity === null) return entity;

    const transformed = { ...entity } as Record<string, unknown>;

    for (const mapping of config.fields) {
      const value = transformed[mapping.field];

      if (mapping.isFilmstrip && Array.isArray(value)) {
        transformed[mapping.field] = value.map((frame) => {
          if (
            typeof frame === "object" &&
            frame !== null &&
            "url" in frame &&
            typeof frame.url === "string"
          ) {
            return {
              ...frame,
              url: signedUrls[frame.url] || frame.url,
            } as Frame;
          }
          return frame;
        });
      } else if (value && typeof value === "string" && signedUrls[value]) {
        transformed[mapping.field] = signedUrls[value];
      }
    }

    if (config.nestedEntities) {
      for (const nested of config.nestedEntities) {
        const nestedEntity = transformed[nested.path];
        if (nestedEntity) {
          const nestedConfig = ENTITY_CONFIGS[nested.entityType];
          transformed[nested.path] = this.applySignedUrlsToEntity(
            nestedEntity,
            nestedConfig,
            signedUrls,
            visited,
          );
        }
      }
    }

    if (config.arrayEntities) {
      for (const arrayConfig of config.arrayEntities) {
        const arrayValue = transformed[arrayConfig.path];
        if (Array.isArray(arrayValue)) {
          transformed[arrayConfig.path] = arrayValue.map((item) => {
            if (item && typeof item === "object") {
              const itemCopy = { ...item } as Record<string, unknown>;
              const targetEntity = arrayConfig.nestedPath
                ? itemCopy[arrayConfig.nestedPath]
                : itemCopy;
              if (targetEntity) {
                const nestedConfig = ENTITY_CONFIGS[arrayConfig.entityType];
                const transformedEntity = this.applySignedUrlsToEntity(
                  targetEntity,
                  nestedConfig,
                  signedUrls,
                  visited,
                );
                if (arrayConfig.nestedPath) {
                  itemCopy[arrayConfig.nestedPath] = transformedEntity;
                  return itemCopy;
                } else {
                  return transformedEntity;
                }
              }
            }
            return item;
          });
        }
      }
    }

    return transformed;
  }

  async transformEntity<T>(
    entity: T,
    entityType: keyof typeof ENTITY_CONFIGS,
  ): Promise<T> {
    const config = ENTITY_CONFIGS[entityType];
    const keysToSign = this.collectKeysFromEntity(entity, config);

    if (keysToSign.length === 0) {
      return entity;
    }

    try {
      const signedUrls = await presignClient.generatePresignedUrls(keysToSign);
      return this.applySignedUrlsToEntity(entity, config, signedUrls) as T;
    } catch (error) {
      console.error(
        `Failed to transform ${entityType} with signed URLs:`,
        error,
      );
      return entity;
    }
  }

  async transformEntities<T>(
    entities: T[],
    entityType: keyof typeof ENTITY_CONFIGS,
  ): Promise<T[]> {
    if (entities.length === 0) {
      return entities;
    }

    const config = ENTITY_CONFIGS[entityType];
    const keysToSign = new Set<string>();

    entities.forEach((entity) => {
      this.collectKeysFromEntity(entity, config).forEach((key) =>
        keysToSign.add(key),
      );
    });

    if (keysToSign.size === 0) {
      return entities;
    }

    try {
      const signedUrls = await presignClient.generatePresignedUrls(
        Array.from(keysToSign),
      );

      return entities.map((entity) =>
        this.applySignedUrlsToEntity(entity, config, signedUrls),
      ) as T[];
    } catch (error) {
      console.error(
        `Failed to transform ${entityType}s with signed URLs:`,
        error,
      );
      return entities;
    }
  }
}

const transformer = new UnifiedTransformer();

export class TransformSession {
  private allKeys = new Set<string>();
  private readonly MAX_BATCH_SIZE = 500;

  addEntityKeys<T>(entity: T, entityType: keyof typeof ENTITY_CONFIGS): void {
    const config = ENTITY_CONFIGS[entityType];
    const keys = transformer.collectKeysFromEntity(entity, config);
    keys.forEach((key) => this.allKeys.add(key));
  }

  addEntitiesKeys<T>(
    entities: T[],
    entityType: keyof typeof ENTITY_CONFIGS,
  ): void {
    entities.forEach((entity) => this.addEntityKeys(entity, entityType));
  }

  addComplexEntityKeys(
    entity: FeedItem | PlaylistItem,
    entityType: "feedItem" | "playlistItem",
  ): void {
    if (entityType === "feedItem") {
      this.addFeedItemKeys(entity as FeedItem);
    } else if (entityType === "playlistItem") {
      this.addPlaylistItemKeys(entity as PlaylistItem);
    }
  }

  private addFeedItemKeys(feedItem: FeedItem): void {
    if (feedItem.dreamItem) {
      this.addEntityKeys(feedItem.dreamItem, "dream");
    }
    if (feedItem.playlistItem) {
      this.addEntityKeys(feedItem.playlistItem, "playlist");
    }
    if (feedItem.user) {
      this.addEntityKeys(feedItem.user, "user");
    }
  }

  private addPlaylistItemKeys(playlistItem: PlaylistItem): void {
    if (playlistItem.dreamItem) {
      this.addEntityKeys(playlistItem.dreamItem, "dream");
    }
    if (playlistItem.playlistItem) {
      this.addEntityKeys(playlistItem.playlistItem, "playlist");
    }
  }

  async executeBatch(): Promise<Record<string, string>> {
    const keysToSign = Array.from(this.allKeys);

    if (keysToSign.length === 0) {
      return {};
    }

    const batches = this.chunkArray(keysToSign, this.MAX_BATCH_SIZE);
    const errors: Error[] = [];
    const signedUrls: Record<string, string> = {};

    for (const batch of batches) {
      try {
        const batchUrls = await presignClient.generatePresignedUrls(batch);
        Object.assign(signedUrls, batchUrls);
      } catch (error) {
        console.error(
          `Failed to presign batch of ${batch.length} keys:`,
          error,
        );
        errors.push(error as Error);
      }
    }

    if (errors.length === batches.length) {
      throw errors[0];
    }

    if (errors.length > 0) {
      console.warn(
        `${errors.length} out of ${batches.length} presign batches failed. ` +
          `${Object.keys(signedUrls).length} URLs were successfully signed.`,
      );
    }

    return signedUrls;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  applyToEntity<T>(
    entity: T,
    entityType: keyof typeof ENTITY_CONFIGS,
    signedUrls: Record<string, string>,
  ): T {
    const config = ENTITY_CONFIGS[entityType];
    return transformer.applySignedUrlsToEntity(entity, config, signedUrls) as T;
  }

  applyToEntities<T>(
    entities: T[],
    entityType: keyof typeof ENTITY_CONFIGS,
    signedUrls: Record<string, string>,
  ): T[] {
    return entities.map((entity) =>
      this.applyToEntity(entity, entityType, signedUrls),
    );
  }

  applyToComplexEntity<T>(
    entity: T,
    entityType: "feedItem" | "playlistItem",
    signedUrls: Record<string, string>,
  ): T {
    if (entityType === "feedItem") {
      return this.applyToFeedItem(entity as FeedItem, signedUrls) as T;
    } else if (entityType === "playlistItem") {
      return this.applyToPlaylistItem(entity as PlaylistItem, signedUrls) as T;
    }
    return entity;
  }

  private applyToFeedItem(
    feedItem: FeedItem,
    signedUrls: Record<string, string>,
  ): FeedItem {
    const transformed = { ...feedItem };

    if (feedItem.dreamItem) {
      transformed.dreamItem = this.applyToEntity(
        feedItem.dreamItem,
        "dream",
        signedUrls,
      );
    }
    if (feedItem.playlistItem) {
      transformed.playlistItem = this.applyToEntity(
        feedItem.playlistItem,
        "playlist",
        signedUrls,
      );
      transformed.playlistItem.computeThumbnail =
        this.createComputeThumbnailMethod();
    }
    if (feedItem.user) {
      transformed.user = this.applyToEntity(feedItem.user, "user", signedUrls);
      transformed.user.setQuota = function () {
        this.quota = 0;
      };
    }

    return transformed;
  }

  private applyToPlaylistItem(
    playlistItem: PlaylistItem,
    signedUrls: Record<string, string>,
  ): PlaylistItem {
    const transformed = { ...playlistItem };

    if (playlistItem.dreamItem) {
      transformed.dreamItem = this.applyToEntity(
        playlistItem.dreamItem,
        "dream",
        signedUrls,
      );
    }
    if (playlistItem.playlistItem) {
      transformed.playlistItem = this.applyToEntity(
        playlistItem.playlistItem,
        "playlist",
        signedUrls,
      );
      transformed.playlistItem.computeThumbnail =
        this.createComputeThumbnailMethod();
    }

    return transformed;
  }

  private createComputeThumbnailMethod() {
    return function (this: Playlist & { items?: PlaylistItem[] }) {
      if (this.thumbnail) {
        return;
      }

      const itemWithThumbnail = this?.items?.find(
        (item: PlaylistItem) =>
          Boolean(item?.dreamItem?.thumbnail) ||
          Boolean(item?.playlistItem?.thumbnail),
      );

      const newThumbnail =
        itemWithThumbnail?.dreamItem?.thumbnail ??
        itemWithThumbnail?.playlistItem?.thumbnail;

      if (newThumbnail) {
        this.thumbnail = newThumbnail;
      }
    };
  }
}

export async function transformMultipleEntityTypes(operations: {
  dreams?: Dream[];
  keyframes?: Keyframe[];
  users?: User[];
  playlists?: Playlist[];
  feedItems?: FeedItem[];
  playlistItems?: PlaylistItem[];
}): Promise<{
  dreams?: Dream[];
  keyframes?: Keyframe[];
  users?: User[];
  playlists?: Playlist[];
  feedItems?: FeedItem[];
  playlistItems?: PlaylistItem[];
}> {
  const session = new TransformSession();

  if (operations.dreams) {
    session.addEntitiesKeys(operations.dreams, "dream");
  }

  if (operations.keyframes) {
    session.addEntitiesKeys(operations.keyframes, "keyframe");
  }

  if (operations.users) {
    session.addEntitiesKeys(operations.users, "user");
  }

  if (operations.playlists) {
    session.addEntitiesKeys(operations.playlists, "playlist");
    operations.playlists.forEach((playlist) => {
      if (playlist.playlistItems) {
        playlist.playlistItems.forEach((item) => {
          session.addComplexEntityKeys(item, "playlistItem");
        });
      }
    });
  }

  if (operations.feedItems) {
    operations.feedItems.forEach((feedItem) => {
      session.addComplexEntityKeys(feedItem, "feedItem");
    });
  }

  if (operations.playlistItems) {
    operations.playlistItems.forEach((item) => {
      session.addComplexEntityKeys(item, "playlistItem");
    });
  }

  const signedUrls = await session.executeBatch();

  const result: typeof operations = {};

  if (operations.dreams) {
    result.dreams = session.applyToEntities(
      operations.dreams,
      "dream",
      signedUrls,
    );
  }

  if (operations.keyframes) {
    result.keyframes = session.applyToEntities(
      operations.keyframes,
      "keyframe",
      signedUrls,
    );
  }

  if (operations.users) {
    result.users = session.applyToEntities(
      operations.users,
      "user",
      signedUrls,
    );
  }

  if (operations.playlists) {
    result.playlists = operations.playlists.map((playlist) => {
      const transformedPlaylist = session.applyToEntity(
        playlist,
        "playlist",
        signedUrls,
      );

      if (transformedPlaylist.playlistItems) {
        transformedPlaylist.playlistItems =
          transformedPlaylist.playlistItems.map((item) =>
            session.applyToComplexEntity(item, "playlistItem", signedUrls),
          );
      }

      return transformedPlaylist;
    });
  }

  if (operations.feedItems) {
    result.feedItems = operations.feedItems.map((feedItem) =>
      session.applyToComplexEntity(feedItem, "feedItem", signedUrls),
    );
  }

  if (operations.playlistItems) {
    result.playlistItems = operations.playlistItems.map((item) =>
      session.applyToComplexEntity(item, "playlistItem", signedUrls),
    );
  }

  return result;
}

export const transformDreamWithSignedUrls = async (
  dream: Dream,
): Promise<Dream> => {
  return transformer.transformEntity(dream, "dream");
};

export const transformDreamsWithSignedUrls = async (
  dreams: Dream[],
): Promise<Dream[]> => {
  return transformer.transformEntities(dreams, "dream");
};

export const transformKeyframeWithSignedUrls = async (
  keyframe: Keyframe,
): Promise<Keyframe> => {
  return transformer.transformEntity(keyframe, "keyframe");
};

export const transformKeyframesWithSignedUrls = async (
  keyframes: Keyframe[],
): Promise<Keyframe[]> => {
  return transformer.transformEntities(keyframes, "keyframe");
};

export const transformUserWithSignedUrls = async (
  user: User,
): Promise<User> => {
  return transformer.transformEntity(user, "user");
};

export const transformUsersWithSignedUrls = async (
  users: User[],
): Promise<User[]> => {
  return transformer.transformEntities(users, "user");
};

export const transformPlaylistWithSignedUrls = async (
  playlist: Playlist,
): Promise<Playlist> => {
  const session = new TransformSession();

  session.addEntityKeys(playlist, "playlist");
  if (playlist.playlistItems) {
    playlist.playlistItems.forEach((item) => {
      session.addComplexEntityKeys(item, "playlistItem");
    });
  }

  const signedUrls = await session.executeBatch();

  const transformedPlaylist = session.applyToEntity(
    playlist,
    "playlist",
    signedUrls,
  );

  if (transformedPlaylist.playlistItems) {
    transformedPlaylist.playlistItems = transformedPlaylist.playlistItems.map(
      (item) => session.applyToComplexEntity(item, "playlistItem", signedUrls),
    );
  }

  return transformedPlaylist;
};

export const transformFeedItemsWithSignedUrls = async (
  feedItems: FeedItem[],
): Promise<FeedItem[]> => {
  if (feedItems.length === 0) {
    return feedItems;
  }

  const session = new TransformSession();

  feedItems.forEach((feedItem) => {
    session.addComplexEntityKeys(feedItem, "feedItem");
  });

  const signedUrls = await session.executeBatch();

  return feedItems.map((feedItem) =>
    session.applyToComplexEntity(feedItem, "feedItem", signedUrls),
  );
};

export const transformPlaylistsWithSignedUrls = async (
  playlists: Playlist[],
): Promise<Playlist[]> => {
  if (playlists.length === 0) {
    return playlists;
  }

  return Promise.all(
    playlists.map((playlist) => transformPlaylistWithSignedUrls(playlist)),
  );
};

export const transformPlaylistItemsWithSignedUrls = async (
  playlistItems: PlaylistItem[],
): Promise<PlaylistItem[]> => {
  if (playlistItems.length === 0) {
    return playlistItems;
  }

  const session = new TransformSession();

  playlistItems.forEach((item) => {
    session.addComplexEntityKeys(item, "playlistItem");
  });

  const signedUrls = await session.executeBatch();

  return playlistItems.map((item) =>
    session.applyToComplexEntity(item, "playlistItem", signedUrls),
  );
};

export const transformPlaylistKeyframesWithSignedUrls = async (
  keyframes: Keyframe[],
): Promise<Keyframe[]> => {
  return transformer.transformEntities(keyframes, "keyframe");
};

export const transformPlaylistKeyframeEntitiesWithSignedUrls = async (
  playlistKeyframes: PlaylistKeyframe[],
): Promise<PlaylistKeyframe[]> => {
  return transformer.transformEntities(playlistKeyframes, "playlistKeyframe");
};
