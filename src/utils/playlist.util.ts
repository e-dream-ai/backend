import { Playlist } from "entities";
import { FindOptionsSelect } from "typeorm";
import { getUserSelectedColumns } from "./user.util";

export const getPlaylistSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<Playlist> => {
  return {
    id: true,
    name: true,
    thumbnail: true,
    items: true,
    playlistItems: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    user: getUserSelectedColumns({ userEmail }),
  };
};
