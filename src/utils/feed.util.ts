import { Dream, FeedItem, Playlist } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  IsNull,
  MoreThanOrEqual,
  Raw,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import { VirtualPlaylist } from "types/feed.types";
import { computePlaylistThumbnailRecursive } from "./playlist.util";
import { DreamMediaType } from "types/dream.types";

type FeedItemFindOptions = {
  // Filters NSFW content
  nsfw?: boolean;
  // Performs text search
  search?: string;
  // Allows to admins get hidden items
  isAdmin?: boolean;
  // Helps obtain hidden items only
  onlyHidden?: boolean;
  // User filter
  userId: number;
  // Gets best ranked content
  ranked?: boolean;
  // Filters by media type (image/video)
  mediaType?: DreamMediaType;
};

type FeedItemFindOptionsWhere =
  | FindOptionsWhere<Playlist | Dream>[]
  | FindOptionsWhere<Playlist | Dream>;

/**
 * Build feed item conditions for dreams and playlists with proper hidden item handling
 */
const buildFeedConditions = (
  feedItemOptions: FindOptionsWhere<FeedItem>,
  dreamBase: FeedItemFindOptionsWhere,
  playlistBase: FeedItemFindOptionsWhere,
  opts: {
    isAdmin: boolean;
    onlyHidden: boolean;
    ranked: boolean;
    userId: number;
  },
): FindOptionsWhere<FeedItem>[] => {
  const { isAdmin, onlyHidden, ranked, userId } = opts;

  if (isAdmin) {
    return [
      { ...feedItemOptions, dreamItem: dreamBase, playlistItem: IsNull() },
      {
        ...feedItemOptions,
        dreamItem: IsNull(),
        playlistItem: ranked
          ? { ...playlistBase, featureRank: MoreThanOrEqual(1) }
          : playlistBase,
      },
    ];
  }

  const dreamItemsConditions: FeedItemFindOptionsWhere = [
    {
      ...dreamBase,
      hidden: true,
      user: Raw((alias) => `${alias} = :userId`, { userId }),
      ...(ranked && { featureRank: MoreThanOrEqual(1) }),
    },
    ...(onlyHidden
      ? []
      : [
        {
          ...dreamBase,
          hidden: false,
          ...(ranked && { featureRank: MoreThanOrEqual(1) }),
        },
      ]),
  ];

  const playlistItemsConditions: FeedItemFindOptionsWhere = [
    {
      ...playlistBase,
      hidden: true,
      user: Raw((alias) => `${alias} = :userId`, { userId }),
      ...(ranked && { featureRank: MoreThanOrEqual(1) }),
    },
    ...(onlyHidden
      ? []
      : [
        {
          ...playlistBase,
          hidden: false,
          ...(ranked && { featureRank: MoreThanOrEqual(1) }),
        },
      ]),
  ];

  return [
    {
      ...feedItemOptions,
      dreamItem: dreamItemsConditions,
      playlistItem: IsNull(),
    },
    {
      ...feedItemOptions,
      dreamItem: IsNull(),
      playlistItem: playlistItemsConditions,
    },
  ];
};

/**
 * Get where conditions that properly handle where query
 * Searches by item name and artist name (FeedItem.user.name)
 */
export const getFeedFindOptionsWhere = (
  options?: FindOptionsWhere<FeedItem>,
  findOptions?: FeedItemFindOptions,
): FindOptionsWhere<FeedItem>[] => {
  const search = findOptions?.search;
  const userId = findOptions?.userId;
  const isAdmin = findOptions?.isAdmin || false;
  const onlyHidden = findOptions?.onlyHidden || false;
  const ranked = findOptions?.ranked || false;
  const mediaType = findOptions?.mediaType;

  const nsfwCondition = findOptions?.nsfw ? {} : { nsfw: false };

  // Base conditions WITHOUT search (search is applied separately for name + artist)
  const baseConditions: FeedItemFindOptionsWhere = {
    ...nsfwCondition,
    ...(onlyHidden ? { hidden: true } : {}),
    deleted_at: IsNull(),
  };

  const dreamBaseConditions: FeedItemFindOptionsWhere = {
    ...baseConditions,
    ...(mediaType ? { mediaType } : {}),
  };

  const conditionOpts = { isAdmin, onlyHidden, ranked, userId: userId ?? 0 };

  if (!search) {
    return buildFeedConditions(
      options || {},
      dreamBaseConditions,
      baseConditions,
      conditionOpts,
    );
  }

  const searchILike = ILike(`%${search}%`);

  // Match by item name (dream/playlist name)
  const byItemName = buildFeedConditions(
    options || {},
    { ...dreamBaseConditions, name: searchILike },
    { ...baseConditions, name: searchILike },
    conditionOpts,
  );

  // Match by artist name (FeedItem.user.name)
  const userObj =
    options?.user && typeof options.user === "object" ? options.user : {};
  const artistOptions: FindOptionsWhere<FeedItem> = {
    ...options,
    user: { ...(userObj as Record<string, unknown>), name: searchILike },
  };
  const byArtistName = buildFeedConditions(
    artistOptions,
    dreamBaseConditions,
    baseConditions,
    conditionOpts,
  );

  return [...byItemName, ...byArtistName];
};

export const getFeedDreamItemSelectedColumns = (): FindOptionsSelect<Dream> => {
  return {
    id: true,
    uuid: true,
    name: true,
    thumbnail: true,
    status: true,
    mediaType: true,
    user: getUserSelectedColumns(),
    displayedOwner: getUserSelectedColumns(),
    playlistItems: {
      id: true,
      playlist: {
        id: true,
        uuid: true,
        name: true,
      },
    },
    created_at: true,
    updated_at: true,
  };
};

export const getFeedPlaylistItemSelectedColumns =
  (): FindOptionsSelect<Playlist> => {
    return {
      id: true,
      uuid: true,
      name: true,
      description: true,
      thumbnail: true,
      featureRank: true,
      user: getUserSelectedColumns(),
      displayedOwner: getUserSelectedColumns(),
      created_at: true,
      updated_at: true,
    };
  };

export const getFeedSelectedColumns = (): FindOptionsSelect<FeedItem> => {
  return {
    id: true,
    type: true,
    dreamItem: getFeedDreamItemSelectedColumns(),
    playlistItem: getFeedPlaylistItemSelectedColumns(),
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns(),
  };
};

export const getFeedFindOptionsRelations =
  (): FindOptionsRelations<FeedItem> => {
    return {
      user: true,
      // Need to get playlists where dream is included to collapse into virtual playlists on feed frontend view
      dreamItem: {
        playlistItems: {
          playlist: true,
        },
      },
      playlistItem: true,
    };
  };

/**
 * Groups feed dreams by playlist, avoiding duplicates for dreams in multiple playlists
 * @param feedItems Array of feed items containing dreams and playlists
 * @returns Map of playlist UUIDs data with associated dreams
 */
export const groupFeedDreamItemsByPlaylist = (
  feedItems: FeedItem[] = [],
): Map<string, VirtualPlaylist> => {
  const playlistsMap = new Map<string, VirtualPlaylist>();
  // Track which dreams have been assigned to virtual playlists to avoid duplicates
  const assignedDreams = new Set<string>();

  // First pass: collect all playlists and their potential dreams
  const playlistCandidates = new Map<
    string,
    {
      playlist: VirtualPlaylist;
      dreams: Dream[];
    }
  >();

  feedItems.forEach((item) => {
    const dream = item?.dreamItem;

    if (dream && dream.playlistItems) {
      dream.playlistItems.forEach((playlistItem) => {
        const dreamPlaylist = playlistItem.playlist;

        if (!dreamPlaylist) {
          return;
        }

        const playlistUUID = dreamPlaylist.uuid;
        let candidate = playlistCandidates.get(playlistUUID);

        if (!candidate) {
          candidate = {
            playlist: {
              id: dreamPlaylist.id,
              uuid: playlistUUID,
              name: dreamPlaylist.name || playlistUUID,
              user: item.user,
              displayedOwner: item.user,
              dreams: [],
              created_at: item.created_at,
            },
            dreams: [],
          };
          playlistCandidates.set(playlistUUID, candidate);
        }

        // Take user from the item and add it to the dream to show it in the card
        const dreamWithUser = { ...dream, user: item.user } as Dream;
        candidate!.dreams.push(dreamWithUser);
      });
    }
  });

  // Second pass: assign dreams to playlists, prioritizing playlists with more dreams
  // Sort playlists by dream count (descending) to prioritize fuller playlists
  const sortedCandidates = Array.from(playlistCandidates.entries()).sort(
    ([, a], [, b]) => b.dreams.length - a.dreams.length,
  );

  sortedCandidates.forEach(([playlistUUID, candidate]) => {
    // Only include dreams that haven't been assigned to other virtual playlists
    const availableDreams = candidate.dreams.filter(
      (dream) => !assignedDreams.has(dream.uuid),
    );

    // Only create virtual playlist if we have 4+ available dreams
    if (availableDreams.length >= 4) {
      // Sort dreams by creation date (newest first) to show most recent dreams
      availableDreams.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      // Update the playlist's created_at to match the newest dream for proper sorting
      candidate.playlist.created_at =
        availableDreams[0]?.created_at || candidate.playlist.created_at;
      candidate.playlist.dreams = availableDreams;
      playlistsMap.set(playlistUUID, candidate.playlist);

      // Mark these dreams as assigned
      availableDreams.forEach((dream) => {
        assignedDreams.add(dream.uuid);
      });
    }
  });

  return playlistsMap;
};

type FeedVisibilityFilter = {
  userId: number;
  isAdmin?: boolean;
  nsfw?: boolean;
  onlyProcessedDreams?: boolean;
};

export const formatFeedResponse = async (
  feed: FeedItem[],
  filter?: FeedVisibilityFilter,
): Promise<FeedItem[]> => {
  const processedItems = feed.map(async (item) => {
    /**
     * Need to obtain playlist items to fill empty thumbnail on playlists
     * will be optimize on https://github.com/e-dream-ai/backend/issues/87
     */
    // Only query if playlistItem exists and has no thumbnail to fill it
    if (item.playlistItem?.id && !item.playlistItem.thumbnail) {
      const fallbackThumbnail = await computePlaylistThumbnailRecursive(
        item.playlistItem.id,
        filter ?? {
          userId: 0,
          isAdmin: false,
          nsfw: true,
          onlyProcessedDreams: true,
        },
      );
      if (fallbackThumbnail) {
        item.playlistItem.thumbnail = fallbackThumbnail;
      }
    }

    //Remove feature rank column
    delete item?.dreamItem?.featureRank;
    delete item?.playlistItem?.featureRank;

    return item;
  });

  return Promise.all(processedItems);
};
