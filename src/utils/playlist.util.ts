import { Playlist } from "entities";
import {
  FindOptionsSelect,
  FindOptionsRelations,
  FindOptionsWhere,
  IsNull,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";

type PlaylistFindOptions = {
  showNSFW?: boolean;
};

type GetPlaylistFindOptionsWhere = (
  options?: FindOptionsWhere<Playlist>,
  playlistFindOptions?: PlaylistFindOptions,
) => FindOptionsWhere<Playlist>[];

export const getPlaylistFindOptionsWhere: GetPlaylistFindOptionsWhere = (
  options,
  playlistFindOptions,
) => {
  if (playlistFindOptions?.showNSFW) {
    return [
      {
        ...options,
        items: {
          dreamItem: { nsfw: true },
          playlistItem: IsNull(),
        },
      },
      {
        ...options,
        items: {
          dreamItem: { nsfw: false },
          playlistItem: IsNull(),
        },
      },
      { ...options, items: { dreamItem: IsNull() } },
    ];
  } else {
    return [
      {
        ...options,
        items: {
          dreamItem: { nsfw: false },
          playlistItem: IsNull(),
        },
      },
      { ...options, items: { dreamItem: IsNull() } },
    ];
  }
};
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
