import { Dream, FeedItem, Playlist } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  IsNull,
  Raw,
} from "typeorm";
import { getDreamSelectedColumns } from "./dream.util";
import { getUserSelectedColumns } from "./user.util";
import { getPlaylistSelectedColumns } from "./playlist.util";

type FeedItemFindOptions = {
  showNSFW?: boolean;
  search?: string;
  isAdmin?: boolean;
  onlyHidden?: boolean;
  userId: number;
};

type FeedItemFindOptionsWhere =
  | FindOptionsWhere<Playlist | Dream>[]
  | FindOptionsWhere<Playlist | Dream>;

/**
 * Get where conditions that properly handle where query
 */
export const getFeedFindOptionsWhere = (
  options?: FindOptionsWhere<FeedItem>,
  findOptions?: FeedItemFindOptions,
): FindOptionsWhere<FeedItem>[] => {
  // Handle findOptions
  const search = findOptions?.search
    ? { name: ILike(`%${findOptions.search}%`) }
    : undefined;
  const userId = findOptions?.userId;
  const isAdmin = findOptions?.isAdmin || false;
  const onlyHidden = findOptions?.onlyHidden || false;

  // Base conditions for NSFW and search
  const nsfwCondition = findOptions?.showNSFW ? {} : { nsfw: false };
  const searchCondition = search ? { name: ILike(`%${search}%`) } : {};

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
      { ...options, dreamItem: IsNull(), playlistItem: baseConditions },
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
    },
    // If onlyHidden, skip adding not hidden items to the query
    // If not onlyHidden, add visible items to the query
    ...(onlyHidden ? [] : [{ ...baseConditions, hidden: false }]),
  ];

  console.log({ onlyHidden, type: typeof onlyHidden });

  return [
    { ...options, dreamItem: itemsConditions, playlistItem: IsNull() },
    { ...options, dreamItem: IsNull(), playlistItem: itemsConditions },
  ];
};

export const getFeedSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<FeedItem> => {
  return {
    id: true,
    type: true,
    dreamItem: getDreamSelectedColumns({ featureRank: true }),
    playlistItem: getPlaylistSelectedColumns({ featureRank: true }),
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns({ userEmail }),
  };
};

export const getFeedFindOptionsRelations =
  (): FindOptionsRelations<FeedItem> => {
    return {
      user: true,
      dreamItem: true,
      playlistItem: {
        /**
         * will be optimize on https://github.com/e-dream-ai/backend/issues/87
         */
        items: {
          playlistItem: { items: { dreamItem: true, playlistItem: true } },
          dreamItem: true,
        },
      },
    };
  };
