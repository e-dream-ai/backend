import { Playlist, PlaylistItem } from "entities";
import {
  FindOptionsSelect,
  FindOptionsRelations,
  FindOptionsWhere,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";
import { DreamStatusType } from "types/dream.types";

type PlaylistFindOptions = {
  showNSFW?: boolean;
};

type GetPlaylistFindOptionsWhere = (
  options?: FindOptionsWhere<Playlist>,
  playlistFindOptions?: PlaylistFindOptions,
) => FindOptionsWhere<Playlist>[];

const playlistRepository = appDataSource.getRepository(Playlist);
const playlistItemRepository = appDataSource.getRepository(PlaylistItem);

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
  status?: boolean;
} = {}): FindOptionsSelect<Playlist> => {
  return {
    id: true,
    uuid: true,
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
        status: true,
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
    onlyProcessedDreams?: boolean;
  };
}): Promise<Playlist | null> => {
  const playlist = await playlistRepository.findOne({
    where: where,
    select: select,
    relations: getPlaylistFindOptionsRelations(),
    order: { items: { order: "ASC" } },
  });

  if (!playlist) return null;

  /**
   * Filter for NSFW
   */
  if (!filter?.nsfw) {
    playlist.items = playlist.items.filter(
      (item) =>
        item?.dreamItem?.nsfw === false || item?.playlist?.nsfw === false,
    );
  }

  /**
   * Filter for onlyProcessedDreams
   */
  if (filter?.onlyProcessedDreams) {
    playlist.items = playlist.items.filter(
      (item) => item?.dreamItem?.status === DreamStatusType.PROCESSED,
    );
  }
  return playlist;
};

export const refreshPlaylistUpdatedAtTimestamp = (id: number) =>
  playlistRepository.update(id, {});

export const refreshPlaylistUpdatedAtTimestampFromPlaylistItems = async (
  playlistItemsIds: number[],
) => {
  for (const id of playlistItemsIds) {
    const pi = await playlistItemRepository.findOne({
      where: { id },
      relations: {
        playlist: true,
      },
    });
    if (pi?.playlist) {
      await refreshPlaylistUpdatedAtTimestamp(pi.playlist.id);
    }
  }
};
