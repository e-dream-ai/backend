import { Dream, Playlist, PlaylistItem, PlaylistKeyframe } from "entities";
import {
  FindOptionsSelect,
  FindOptionsRelations,
  FindOptionsWhere,
  In,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";
import { DreamStatusType } from "types/dream.types";
import { playlistKeyframeRepository } from "database/repositories";
import { framesToSeconds } from "./video.utils";

type GetPlaylistFilterOptions = {
  // userId from the user that is requesting the playlist
  // needed to handle hidden field on playlist and nested items
  userId: number;
  isAdmin?: boolean;
  nsfw?: boolean;
  onlyProcessedDreams?: boolean;
};

const playlistRepository = appDataSource.getRepository(Playlist);
const playlistItemRepository = appDataSource.getRepository(PlaylistItem);
const dreamRepository = appDataSource.getRepository(Dream);

export const getPlaylistFindOptionsWhere = (
  userId: number,
  isAdmin: boolean,
): FindOptionsWhere<Playlist> | FindOptionsWhere<Playlist>[] => {
  // For admins, no filtering is needed
  if (isAdmin) {
    return {};
  }

  return [
    { hidden: false },
    {
      hidden: true,
      user: { id: userId },
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
    description: true,
    thumbnail: true,
    // items: getPlaylistItemSelectedColumns(),
    created_at: true,
    updated_at: true,
    deleted_at: true,
    nsfw: true,
    hidden: true,
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
        video: true,
        startKeyframe: {
          uuid: true,
        },
        endKeyframe: {
          uuid: true,
        },
      },
      playlistItem: {
        id: true,
        uuid: true,
        name: true,
        description: true,
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
  filter: GetPlaylistFilterOptions;
}): Promise<Playlist | null> => {
  const playlist = await playlistRepository.findOne({
    where: where,
    select: select,
    relations: getPlaylistFindOptionsRelations(),
  });

  if (!playlist) return null;

  // Get playlist items using query builder
  playlist.items = await getPlaylistItemsQueryBuilder(playlist.id, filter);
  // Call computeThumbnail explicitly after getting the items
  playlist.computeThumbnail();
  return playlist;
};

/**
 * findOnePlaylist without fetching items
 */
export const findOnePlaylistWithoutItems = async ({
  where,
  select,
}: {
  where: FindOptionsWhere<Playlist> | FindOptionsWhere<Playlist>[];
  select: FindOptionsSelect<Playlist>;
}): Promise<Playlist | null> => {
  const playlist = await playlistRepository.findOne({
    where: where,
    select: select,
    relations: getPlaylistFindOptionsRelations(),
  });

  if (!playlist) return null;

  playlist.computeThumbnail();
  return playlist;
};

/**
 * Creates an optimized query builder for playlist items with all necessary relations
 */
export const getPlaylistItemsQueryBuilder = (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
) => {
  const isAdmin = filter.isAdmin;
  const userId = filter.userId;

  // Define the user fields to select (excluding email)
  const createUserFieldSelections = (alias: string) => {
    return [
      `${alias}.id`,
      `${alias}.uuid`,
      `${alias}.name`,
      `${alias}.avatar`,
      // Add more if needed
    ];
  };

  const queryBuilder = playlistItemRepository
    .createQueryBuilder("item")
    .where("item.playlistId = :playlistId", { playlistId })
    // Ensure playlist items aren't deleted
    .andWhere("item.deleted_at IS NULL")
    // Dream item and its relations
    .leftJoinAndSelect("item.dreamItem", "dreamItem")
    .leftJoin("dreamItem.user", "dreamItemUser")
    .addSelect(createUserFieldSelections("dreamItemUser"))
    .leftJoin("dreamItem.displayedOwner", "dreamItemDisplayedOwner")
    .addSelect(createUserFieldSelections("dreamItemDisplayedOwner"))
    .leftJoinAndSelect("dreamItem.startKeyframe", "startKeyframe")
    .leftJoinAndSelect("dreamItem.endKeyframe", "endKeyframe")
    // Playlist item and its relations
    .leftJoinAndSelect("item.playlistItem", "playlistItem")
    .leftJoin("playlistItem.user", "playlistItemUser")
    .addSelect(createUserFieldSelections("playlistItemUser"))
    .leftJoin("playlistItem.displayedOwner", "playlistItemDisplayedOwner")
    .addSelect(createUserFieldSelections("playlistItemDisplayedOwner"))
    // Nested items within playlist items
    .leftJoinAndSelect("playlistItem.items", "nestedItems")
    .leftJoinAndSelect("nestedItems.dreamItem", "nestedDreamItem")
    .leftJoinAndSelect("nestedItems.playlistItem", "nestedPlaylistItem")
    // Order by item order
    .orderBy("item.order", "ASC");

  // Apply filtering for nsfw
  if (filter?.nsfw === false) {
    queryBuilder.andWhere(
      `(
      (dreamItem.nsfw IS NULL OR dreamItem.nsfw = :nsfw) AND 
      (playlistItem.nsfw IS NULL OR playlistItem.nsfw = :nsfw)
    )`,
      { nsfw: false },
    );
  }

  // Apply filtering for get processed dreams only
  if (filter?.onlyProcessedDreams) {
    queryBuilder.andWhere(
      `(
      dreamItem.status = :status OR 
      playlistItem.id IS NOT NULL
    )`,
      { status: DreamStatusType.PROCESSED },
    );
  }

  if (!isAdmin) {
    // If the user is not an admin, only show non-hidden items if is not the owner
    queryBuilder.andWhere(
      `(
        (dreamItem.hidden IS NULL OR (dreamItem.hidden = false OR (dreamItem.hidden = true AND dreamItem.user.id = :userId))) AND
        (playlistItem.hidden IS NULL OR (playlistItem.hidden = false OR (playlistItem.hidden = true AND playlistItem.user.id = :userId)))
      )`,
      { userId },
    );
  }

  return queryBuilder.getMany();
};

/**
 * Gets the first visible playlist item for a playlist using the same filtering
 * rules as paginated items, ordered by item.order ASC.
 */
export const getFirstVisiblePlaylistItem = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
) => {
  const isAdmin = filter.isAdmin;
  const userId = filter.userId;

  const createUserFieldSelections = (alias: string) => {
    return [`${alias}.id`, `${alias}.uuid`, `${alias}.name`, `${alias}.avatar`];
  };

  let queryBuilder = playlistItemRepository
    .createQueryBuilder("item")
    .where("item.playlistId = :playlistId", { playlistId })
    .andWhere("item.deleted_at IS NULL")
    .leftJoinAndSelect("item.dreamItem", "dreamItem")
    .leftJoin("dreamItem.user", "dreamItemUser")
    .addSelect(createUserFieldSelections("dreamItemUser"))
    .leftJoin("dreamItem.displayedOwner", "dreamItemDisplayedOwner")
    .addSelect(createUserFieldSelections("dreamItemDisplayedOwner"))
    .leftJoinAndSelect("item.playlistItem", "playlistItem")
    .leftJoin("playlistItem.user", "playlistItemUser")
    .addSelect(createUserFieldSelections("playlistItemUser"))
    .leftJoin("playlistItem.displayedOwner", "playlistItemDisplayedOwner")
    .addSelect(createUserFieldSelections("playlistItemDisplayedOwner"))
    .orderBy("item.order", "ASC")
    .take(1);

  if (filter?.nsfw === false) {
    queryBuilder = queryBuilder
      .andWhere("(dreamItem.nsfw = false OR dreamItem.nsfw IS NULL)")
      .andWhere("(playlistItem.nsfw = false OR playlistItem.nsfw IS NULL)");
  }

  if (!isAdmin) {
    queryBuilder = queryBuilder
      .andWhere(
        "(dreamItem.hidden = false OR dreamItem.hidden IS NULL OR dreamItem.userId = :userId)",
        { userId },
      )
      .andWhere(
        "(playlistItem.hidden = false OR playlistItem.hidden IS NULL OR playlistItem.userId = :userId)",
        { userId },
      );
  }

  return await queryBuilder.getOne();
};

/**
 * Gets paginated playlist items
 */
export const getPaginatedPlaylistItems = async ({
  playlistId,
  filter,
  take = 30,
  skip = 0,
}: {
  playlistId: number;
  filter: GetPlaylistFilterOptions;
  take?: number;
  skip?: number;
}) => {
  const isAdmin = filter.isAdmin;
  const userId = filter.userId;

  const createUserFieldSelections = (alias: string) => {
    return [`${alias}.id`, `${alias}.uuid`, `${alias}.name`, `${alias}.avatar`];
  };

  let queryBuilder = playlistItemRepository
    .createQueryBuilder("item")
    .where("item.playlistId = :playlistId", { playlistId })
    // Ensure playlist items aren't deleted
    .andWhere("item.deleted_at IS NULL")
    // Dream item and its relations
    .leftJoinAndSelect("item.dreamItem", "dreamItem")
    .leftJoin("dreamItem.user", "dreamItemUser")
    .addSelect(createUserFieldSelections("dreamItemUser"))
    .leftJoin("dreamItem.displayedOwner", "dreamItemDisplayedOwner")
    .addSelect(createUserFieldSelections("dreamItemDisplayedOwner"))
    .leftJoinAndSelect("dreamItem.startKeyframe", "startKeyframe")
    .leftJoinAndSelect("dreamItem.endKeyframe", "endKeyframe")
    // Playlist item and its relations
    .leftJoinAndSelect("item.playlistItem", "playlistItem")
    .leftJoin("playlistItem.user", "playlistItemUser")
    .addSelect(createUserFieldSelections("playlistItemUser"))
    .leftJoin("playlistItem.displayedOwner", "playlistItemDisplayedOwner")
    .addSelect(createUserFieldSelections("playlistItemDisplayedOwner"))
    // Nested items within playlist items
    .leftJoinAndSelect("playlistItem.items", "nestedItems")
    .leftJoinAndSelect("nestedItems.dreamItem", "nestedDreamItem")
    .leftJoinAndSelect("nestedItems.playlistItem", "nestedPlaylistItem");

  if (filter?.nsfw === false) {
    queryBuilder = queryBuilder
      .andWhere("(dreamItem.nsfw = false OR dreamItem.nsfw IS NULL)")
      .andWhere("(playlistItem.nsfw = false OR playlistItem.nsfw IS NULL)");
  }

  if (!isAdmin) {
    queryBuilder = queryBuilder
      .andWhere(
        "(dreamItem.hidden = false OR dreamItem.hidden IS NULL OR dreamItem.userId = :userId)",
        { userId },
      )
      .andWhere(
        "(playlistItem.hidden = false OR playlistItem.hidden IS NULL OR playlistItem.userId = :userId)",
        { userId },
      );
  }

  // Order by item order
  queryBuilder = queryBuilder.orderBy("item.order", "ASC");

  // Apply pagination
  queryBuilder = queryBuilder.skip(skip).take(take);

  const [items, totalCount] = await queryBuilder.getManyAndCount();

  return {
    items,
    totalCount,
  };
};

export const computePlaylistTotalDurationSeconds = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
  visitedPlaylistIds: Set<number> = new Set(),
): Promise<number> => {
  if (!playlistId) return 0;

  let totalSeconds = 0;
  const queue: number[] = [playlistId];

  while (queue.length > 0) {
    const batchIds: number[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (!visitedPlaylistIds.has(id)) {
        visitedPlaylistIds.add(id);
        batchIds.push(id);
      }
    }

    if (!batchIds.length) break;

    const qb = playlistItemRepository
      .createQueryBuilder("item")
      .where("item.playlistId IN (:...playlistIds)", { playlistIds: batchIds })
      .andWhere("item.deleted_at IS NULL")
      .leftJoin("item.dreamItem", "dreamItem")
      .leftJoin("item.playlistItem", "childPlaylist")
      .select([
        "dreamItem.processedVideoFrames AS frames",
        "dreamItem.activityLevel AS activity",
        "dreamItem.status AS dreamStatus",
        "dreamItem.nsfw AS dreamNsfw",
        "dreamItem.hidden AS dreamHidden",
        "dreamItem.userId AS dreamUserId",
        "childPlaylist.id AS childPlaylistId",
        "childPlaylist.nsfw AS childNsfw",
        "childPlaylist.hidden AS childHidden",
        "childPlaylist.userId AS childUserId",
      ]);

    if (filter?.nsfw === false) {
      qb.andWhere(
        "( (dreamItem.nsfw = false OR dreamItem.nsfw IS NULL) AND (childPlaylist.nsfw = false OR childPlaylist.nsfw IS NULL) )",
      );
    }

    qb.andWhere(
      "(dreamItem.status = :status OR childPlaylist.id IS NOT NULL)",
      { status: DreamStatusType.PROCESSED },
    );

    if (!filter?.isAdmin) {
      qb.andWhere(
        "(dreamItem.hidden = false OR dreamItem.hidden IS NULL OR dreamItem.userId = :userId)",
        { userId: filter.userId },
      ).andWhere(
        "(childPlaylist.hidden = false OR childPlaylist.hidden IS NULL OR childPlaylist.userId = :userId)",
        { userId: filter.userId },
      );
    }

    const rows = await qb.getRawMany<{
      frames: number | null;
      activity: number | null;
      childPlaylistId: number | null;
    }>();

    for (const row of rows) {
      if (row.frames && row.activity) {
        totalSeconds += framesToSeconds(row.frames, row.activity);
      }
      if (row.childPlaylistId && !visitedPlaylistIds.has(row.childPlaylistId)) {
        queue.push(row.childPlaylistId);
      }
    }
  }

  return totalSeconds;
};

/**
 * Gets paginated playlist keyframes
 */
export const getPaginatedPlaylistKeyframes = async ({
  playlistId,
  take = 30,
  skip = 0,
}: {
  playlistId: number;
  take?: number;
  skip?: number;
}) => {
  const [keyframes, totalCount] = await playlistKeyframeRepository.findAndCount(
    {
      where: {
        playlist: { id: playlistId },
      },
      select: {
        id: true,
        order: true,
        updated_at: true,
        keyframe: {
          id: true,
          uuid: true,
          name: true,
          image: true,
          user: {
            id: true,
            uuid: true,
            name: true,
            avatar: true,
          },
          displayedOwner: {
            id: true,
            uuid: true,
            name: true,
            avatar: true,
          },
        },
      },
      relations: {
        keyframe: {
          user: true,
          displayedOwner: true,
        },
      },
      order: {
        order: "ASC",
      },
      take,
      skip,
    },
  );

  return {
    keyframes,
    totalCount,
  };
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

/**
 * Deletes playlist item and resets playlist order
 */
export const deletePlaylistItemAndResetOrder = async ({
  playlistId,
  itemIdToDelete,
}: {
  playlistId: number;
  itemIdToDelete: number;
}) => {
  // Start a transaction and following steps
  await appDataSource.transaction(async (transactionalEntityManager) => {
    const itemToDelete = await transactionalEntityManager.findOne(
      PlaylistItem,
      {
        where: { id: itemIdToDelete, playlist: { id: playlistId } },
      },
    );

    // Handle not found
    if (!itemToDelete) {
      throw new Error("Playlist item not found");
    }

    // 1. Soft remove the specified item
    await transactionalEntityManager.softRemove(itemToDelete);

    // 2. Fetch all remaining items in the playlist, ordered by their current order
    const remainingItems = await transactionalEntityManager.find(PlaylistItem, {
      where: { playlist: { id: playlistId } },
      order: { order: "ASC" },
    });

    for (let i = 0; i < remainingItems.length; i++) {
      // 3. Update the order of all remaining items using zero-based indexing
      const newOrder = i;
      const itemId = remainingItems[i].id;

      // 4. Update the items
      await transactionalEntityManager.update(PlaylistItem, itemId, {
        order: newOrder,
      });
    }
  });
};

/**
 * Deletes playlist keyframe and resets playlist order
 */
export const deletePlaylistKeyframeAndResetOrder = async ({
  playlistId,
  playlistKeyframeId,
}: {
  playlistId: number;
  playlistKeyframeId: number;
}) => {
  // Start a transaction and following steps
  await appDataSource.transaction(async (transactionalEntityManager) => {
    const keyframeToDelete = await transactionalEntityManager.findOne(
      PlaylistKeyframe,
      {
        where: { id: playlistKeyframeId, playlist: { id: playlistId } },
      },
    );

    // Handle not found
    if (!keyframeToDelete) {
      throw new Error("Playlist keyframe not found");
    }

    // 1. Soft remove the specified keyframe
    await transactionalEntityManager.softRemove(keyframeToDelete);

    // 2. Fetch all remaining keyframes in the playlist, ordered by their current order
    const remainingKeyframes = await transactionalEntityManager.find(
      PlaylistKeyframe,
      {
        where: { playlist: { id: playlistId } },
        order: { order: "ASC" },
      },
    );

    for (let i = 0; i < remainingKeyframes.length; i++) {
      // 3. Update the order of all remaining keyframes using zero-based indexing
      const newOrder = i;
      const keyframeId = remainingKeyframes[i].id;

      // 4. Update the keyframes
      await transactionalEntityManager.update(PlaylistKeyframe, keyframeId, {
        order: newOrder,
      });
    }
  });
};

/**
 *
 * @param uuids dreams uuids
 * @returns {Dream[]} array dreams
 */
export const populateDefautPlaylist = async (
  uuids?: string[],
): Promise<Dream[]> => {
  if (!uuids) {
    return [];
  }

  const dreams = await dreamRepository.find({
    where: { uuid: In(uuids) },
    relations: { user: true, startKeyframe: true, endKeyframe: true },
    select: {
      id: true,
      uuid: true,
      name: true,
      video: true,
      thumbnail: true,
      user: {
        id: true,
        uuid: true,
        name: true,
        avatar: true,
      },
    },
  });

  return dreams;
};
