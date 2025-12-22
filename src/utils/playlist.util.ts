import { Dream, Playlist, PlaylistItem, PlaylistKeyframe } from "entities";
import {
  FindOptionsSelect,
  FindOptionsRelations,
  FindOptionsWhere,
  In,
} from "typeorm";
import { getUserSelectedColumns } from "./user.util";
import appDataSource from "database/app-data-source";
import { DreamMediaType, DreamStatusType } from "types/dream.types";
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
  // For client endpoints, exclude image dreams
  if (filter?.onlyProcessedDreams) {
    queryBuilder.andWhere(
      `(
      (dreamItem.status = :status AND (dreamItem.mediaType IS NULL OR dreamItem.mediaType != :imageMediaType)) OR 
      playlistItem.id IS NOT NULL
    )`,
      {
        status: DreamStatusType.PROCESSED,
        imageMediaType: DreamMediaType.IMAGE,
      },
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

export const computePlaylistThumbnailRecursive = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
  visited: Set<number> = new Set(),
): Promise<string | null> => {
  if (visited.has(playlistId)) {
    return null;
  }
  visited.add(playlistId);

  const firstItem = await getFirstVisiblePlaylistItem(playlistId, filter);
  if (!firstItem) return null;

  if (firstItem.dreamItem?.thumbnail) {
    return firstItem.dreamItem.thumbnail;
  }

  if (firstItem.playlistItem) {
    if (firstItem.playlistItem.thumbnail) {
      return firstItem.playlistItem.thumbnail;
    }
    return await computePlaylistThumbnailRecursive(
      firstItem.playlistItem.id,
      filter,
      visited,
    );
  }

  return null;
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
  if (!playlistId || visitedPlaylistIds.has(playlistId)) return 0;
  visitedPlaylistIds.add(playlistId);

  let totalSeconds = 0;

  // Get all items for this playlist using the same logic as getPaginatedPlaylistItems
  const items = await getPlaylistItemsQueryBuilder(playlistId, filter);

  for (const item of items) {
    // If it's a dream item, add its duration
    if (
      item.dreamItem &&
      item.dreamItem.processedVideoFrames &&
      item.dreamItem.activityLevel
    ) {
      totalSeconds += framesToSeconds(
        item.dreamItem.processedVideoFrames,
        item.dreamItem.activityLevel,
      );
    }

    // If it's a nested playlist, recursively calculate its duration
    if (item.playlistItem) {
      const nestedDuration = await computePlaylistTotalDurationSeconds(
        item.playlistItem.id,
        filter,
        visitedPlaylistIds,
      );
      totalSeconds += nestedDuration;
    }
  }

  return totalSeconds;
};

export const computePlaylistTotalDreamCount = async (
  playlistId: number,
  filter: GetPlaylistFilterOptions,
  visitedPlaylistIds: Set<number> = new Set(),
): Promise<number> => {
  if (!playlistId || visitedPlaylistIds.has(playlistId)) return 0;
  visitedPlaylistIds.add(playlistId);

  let totalDreamCount = 0;

  const items = await getPlaylistItemsQueryBuilder(playlistId, filter);

  for (const item of items) {
    if (item.dreamItem) {
      if (
        !filter.onlyProcessedDreams ||
        item.dreamItem.status === DreamStatusType.PROCESSED
      ) {
        totalDreamCount++;
      }
    }

    if (item.playlistItem) {
      const nestedDreamCount = await computePlaylistTotalDreamCount(
        item.playlistItem.id,
        filter,
        visitedPlaylistIds,
      );
      totalDreamCount += nestedDreamCount;
    }
  }

  return totalDreamCount;
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

    const deletedOrder = itemToDelete.order;

    await transactionalEntityManager.softRemove(itemToDelete);

    await transactionalEntityManager
      .createQueryBuilder()
      .update(PlaylistItem)
      .set({
        order: () => "\"order\" - 1",
      })
      .where("playlistId = :playlistId", { playlistId })
      .andWhere("deleted_at IS NULL")
      .andWhere("\"order\" > :deletedOrder", { deletedOrder })
      .execute();
  });
};

export const bulkDeletePlaylistItemsAndResetOrder = async ({
  playlistId,
  itemIdsToDelete,
}: {
  playlistId: number;
  itemIdsToDelete: number[];
}) => {
  if (itemIdsToDelete.length === 0) {
    return;
  }

  await appDataSource.transaction(async (transactionalEntityManager) => {
    await transactionalEntityManager.softRemove(
      PlaylistItem,
      itemIdsToDelete.map((id) => ({ id, playlist: { id: playlistId } })),
    );

    const remainingItems = await transactionalEntityManager.find(PlaylistItem, {
      where: { playlist: { id: playlistId } },
      order: { order: "ASC" },
    });

    if (remainingItems.length > 0) {
      const caseStatements = remainingItems
        .map((item, index) => `WHEN id = ${item.id} THEN ${index}`)
        .join(" ");

      await transactionalEntityManager.query(
        `
        UPDATE playlist_item
        SET "order" = CASE ${caseStatements} END
        WHERE "playlistId" = $1 AND "deleted_at" IS NULL
      `,
        [playlistId],
      );
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

    const deletedOrder = keyframeToDelete.order;

    await transactionalEntityManager.softRemove(keyframeToDelete);

    await transactionalEntityManager
      .createQueryBuilder()
      .update(PlaylistKeyframe)
      .set({
        order: () => "\"order\" - 1",
      })
      .where("playlistId = :playlistId", { playlistId })
      .andWhere("deleted_at IS NULL")
      .andWhere("\"order\" > :deletedOrder", { deletedOrder })
      .execute();
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
