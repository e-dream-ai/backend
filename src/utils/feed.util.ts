import { Dream, FeedItem, Playlist, PlaylistItem } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  IsNull,
  MoreThanOrEqual,
  Not,
  Raw,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";

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
};

type FeedItemFindOptionsWhere =
  | FindOptionsWhere<Playlist | Dream>[]
  | FindOptionsWhere<Playlist | Dream>;

const playlistItemRepository = appDataSource.getRepository(PlaylistItem);

/**
 * Get where conditions that properly handle where query
 */
export const getFeedFindOptionsWhere = (
  options?: FindOptionsWhere<FeedItem>,
  findOptions?: FeedItemFindOptions,
): FindOptionsWhere<FeedItem>[] => {
  // Handle findOptions
  const searchCondition = findOptions?.search
    ? { name: ILike(`%${findOptions.search}%`) }
    : undefined;
  const userId = findOptions?.userId;
  const isAdmin = findOptions?.isAdmin || false;
  const onlyHidden = findOptions?.onlyHidden || false;
  const ranked = findOptions?.ranked || false;

  // Base conditions for NSFW and search
  const nsfwCondition = findOptions?.nsfw ? {} : { nsfw: false };

  // Combine base conditions
  const baseConditions: FeedItemFindOptionsWhere = {
    ...nsfwCondition,
    ...searchCondition,
    ...(onlyHidden ? { hidden: true } : {}),
  };

  // For admins, no hidden filter is applied
  if (isAdmin) {
    return [
      { ...options, dreamItem: baseConditions, playlistItem: IsNull() },
      {
        ...options,
        dreamItem: IsNull(),
        playlistItem: ranked
          ? { ...baseConditions, featureRank: MoreThanOrEqual(1) }
          : baseConditions,
      },
    ];
  }

  // For normal users
  // Handle hidden items with ownership
  // Apply on both (dreams and playlists)
  // Add base conditions (search and NSFW)
  const itemsConditions: FeedItemFindOptionsWhere = [
    {
      ...baseConditions,
      hidden: true,
      user: Raw((alias) => `${alias} = :userId`, { userId }),
      ...(ranked && { featureRank: MoreThanOrEqual(1) }),
    },
    // If onlyHidden, skip adding not hidden items to the query
    // If not onlyHidden, add visible items to the query
    ...(onlyHidden
      ? []
      : [
        {
          ...baseConditions,
          hidden: false,
          ...(ranked && { featureRank: MoreThanOrEqual(1) }),
        },
      ]),
  ];

  return [
    { ...options, dreamItem: itemsConditions, playlistItem: IsNull() },
    {
      ...options,
      dreamItem: IsNull(),
      playlistItem: itemsConditions,
    },
  ];
};

export const getFeedDreamItemSelectedColumns = (): FindOptionsSelect<Dream> => {
  return {
    id: true,
    uuid: true,
    name: true,
    thumbnail: true,
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

export const formatFeedResponse = async (
  feed: FeedItem[],
): Promise<FeedItem[]> => {
  const processedItems = feed.map(async (item) => {
    /**
     * Need to obtain playlist items to fill empty thumbnail on playlists
     * will be optimize on https://github.com/e-dream-ai/backend/issues/87
     */
    // Only query if playlistItem exists and has no thumbnail to fill it
    if (item.playlistItem?.id && !item.playlistItem.thumbnail) {
      // Try to find an item with thumbnail
      const foundPI = await playlistItemRepository.findOne({
        where: {
          dreamItem: {
            thumbnail: Not(IsNull()),
          },
          playlist: {
            id: item.playlistItem.id,
          },
        },
        relations: {
          dreamItem: true,
        },
        select: {
          dreamItem: {
            thumbnail: true,
          },
        },
      });

      // If there's an item use its thumbnail
      if (foundPI && foundPI.dreamItem) {
        item.playlistItem.thumbnail = foundPI.dreamItem.thumbnail;
      }
    }

    //Remove feature rank column
    delete item?.dreamItem?.featureRank;
    delete item?.playlistItem?.featureRank;

    return item;
  });

  return Promise.all(processedItems);
};
