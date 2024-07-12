import { Playlist, PlaylistItem } from "entities";
import {
  FindOptionsSelect,
  FindOptionsRelations,
  FindOptionsWhere,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";

type PlaylistFindOptions = {
  showNSFW?: boolean;
};

type GetPlaylistFindOptionsWhere = (
  options?: FindOptionsWhere<Playlist>,
  playlistFindOptions?: PlaylistFindOptions,
) => FindOptionsWhere<Playlist>[];

const playlistRepository = appDataSource.getRepository(Playlist);

export const getPlaylistFindOptionsWhere: GetPlaylistFindOptionsWhere = (
  options,
) => {
  return [
    {
      ...options,
    },
  ];
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
    items: getPlaylistItemSelectedColumns(),
    created_at: true,
    updated_at: true,
    deleted_at: true,
    nsfw: true,
    featureRank,
    user: getUserSelectedColumns({ userEmail }),
    displayedOwner: getUserSelectedColumns({ userEmail }),
  };
};

export const getPlaylistFindOptionsRelations =
  (): FindOptionsRelations<Playlist> => {
    return {
      user: true,
      displayedOwner: true,
      feedItem: true,
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

export const getPlaylistItemSelectedColumns =
  (): FindOptionsSelect<PlaylistItem> => {
    return {
      id: true,
      order: true,
      type: true,
      dreamItem: {
        id: true,
        uuid: true,
        name: true,
        thumbnail: true,
        nsfw: true,
        user: getUserSelectedColumns(),
        displayedOwner: getUserSelectedColumns(),
        updated_at: true,
      },
      playlistItem: {
        id: true,
        name: true,
        thumbnail: true,
        nsfw: true,
        user: getUserSelectedColumns(),
        displayedOwner: getUserSelectedColumns(),
        updated_at: true,
      },
      created_at: true,
      updated_at: true,
    };
  };

export const findOnePlaylist = async ({
  where,
  select,
  filter,
}: {
  where: FindOptionsWhere<Playlist> | FindOptionsWhere<Playlist>[];
  select: FindOptionsSelect<Playlist>;
  filter?: {
    nsfw?: boolean;
  };
}): Promise<Playlist | null> => {
  const playlist = await playlistRepository.findOne({
    where: where,
    select: select,
    relations: getPlaylistFindOptionsRelations(),
    order: { items: { order: "ASC" } },
  });

  if (!playlist) return null;

  if (!filter?.nsfw) {
    playlist.items = playlist.items.filter(
      (item) =>
        item?.dreamItem?.nsfw === false || item?.playlist?.nsfw === false,
    );
  }
  return playlist;
};
