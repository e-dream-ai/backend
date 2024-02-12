import { FeedItem } from "entities";
import { FindOptionsSelect } from "typeorm";
import { getDreamSelectedColumns } from "./dream.util";
import { getUserSelectedColumns } from "./user.util";

export const getFeedSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<FeedItem> => {
  return {
    id: true,
    type: true,
    dreamItem: getDreamSelectedColumns(),
    // playlistItem: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns({ userEmail }),
  };
};
