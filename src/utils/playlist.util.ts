import { Playlist } from "entities";
import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { getUserSelectedColumns } from "./user.util";

export const getPlaylistSelectedColumns = ({
  userEmail,
  featureRank,
}: {
  userEmail?: boolean;
  featureRank?: boolean;
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
    featureRank,
    user: getUserSelectedColumns({ userEmail }),
    displayedOwner: getUserSelectedColumns(),
  };
};

export const getPlaylistFindOptionsRelations =
  (): FindOptionsRelations<Playlist> => {
    return {
      user: true,
      displayedOwner: true,
      items: {
        playlistItem: {
          user: true,
          displayedOwner: true,
          /**
           * will be optimize on https://github.com/e-dream-ai/backend/issues/87
           */
          items: { dreamItem: true, playlistItem: true },
        },
        dreamItem: { user: true, displayedOwner: true },
      },
    };
  };
