import { FeedItem } from "entities";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { getDreamSelectedColumns } from "./dream.util";
import { getUserSelectedColumns } from "./user.util";
import { getPlaylistSelectedColumns } from "./playlist.util";

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
