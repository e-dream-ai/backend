import { FeedItem, Playlist } from "entities";
import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  IsNull,
} from "typeorm";
import { getDreamSelectedColumns } from "./dream.util";
import { getUserSelectedColumns } from "./user.util";
import { getPlaylistSelectedColumns } from "./playlist.util";

type FeedItemFindOptions = {
  showNSFW?: boolean;
  search?: string;
};

type GetFeedFindOptionsWhere = (
  options?: FindOptionsWhere<FeedItem>,
  feedFindOptions?: FeedItemFindOptions,
) => FindOptionsWhere<FeedItem>[];

export const getFeedFindOptionsWhere: GetFeedFindOptionsWhere = (
  options,
  feedFindOptions,
) => {
  const search = feedFindOptions?.search
    ? { name: ILike(`%${feedFindOptions.search}%`) }
    : undefined;

  let playlistItemOption: FindOptionsWhere<Playlist> = {};

  if (options?.playlistItem && typeof options?.playlistItem === "object") {
    playlistItemOption = options?.playlistItem as FindOptionsWhere<Playlist>;
  }

  if (feedFindOptions?.showNSFW) {
    return [
      {
        ...options,
        dreamItem: { ...search },
        playlistItem: IsNull(),
      },
      {
        ...options,
        dreamItem: IsNull(),
        playlistItem: { ...search, ...playlistItemOption },
      },
    ];
  } else {
    return [
      {
        ...options,
        dreamItem: { nsfw: false, ...search },
        playlistItem: IsNull(),
      },
      {
        ...options,
        dreamItem: IsNull(),
        playlistItem: { nsfw: false, ...search, ...playlistItemOption },
      },
    ];
  }
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
