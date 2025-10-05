import { PutObjectCommand } from "@aws-sdk/client-s3";
import { tracker } from "clients/google-analytics";
import { r2Client } from "clients/r2.client";

import { MYME_TYPES, MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { THUMBNAIL } from "constants/multimedia.constants";
import { PAGINATION } from "constants/pagination.constants";
import { PLAYLIST_PREFIX } from "constants/playlist.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import {
  defaultPlaylistRepository,
  playlistRepository,
  playlistKeyframeRepository,
  dreamRepository,
  keyframeRepository,
  feedItemRepository,
  userRepository,
  playlistItemRepository,
} from "database/repositories";
import {
  FeedItem,
  Playlist,
  PlaylistItem,
  PlaylistKeyframe,
  User,
} from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { ILike } from "typeorm";
import { DreamStatusType } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import {
  AddPlaylistItemRequest,
  AddPlaylistKeyframeRequest,
  CreatePlaylistRequest,
  GetPlaylistQuery,
  GetPlaylistItemsQuery,
  GetPlaylistKeyframesQuery,
  OrderPlaylistRequest,
  PlaylistItemType,
  PlaylistParamsRequest,
  RemovePlaylistItemRequest,
  RemovePlaylistKeyframeRequest,
  UpdatePlaylistRequest,
} from "types/playlist.types";
import { computeDefaultPlaylistFromUserId } from "utils/default-playlist.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  deletePlaylistItemAndResetOrder,
  deletePlaylistKeyframeAndResetOrder,
  findOnePlaylist,
  findOnePlaylistWithoutItems,
  getPaginatedPlaylistItems,
  getPaginatedPlaylistKeyframes,
  getPlaylistSelectedColumns,
  populateDefautPlaylist,
  refreshPlaylistUpdatedAtTimestamp,
  computePlaylistTotalDurationSeconds,
} from "utils/playlist.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
  handleInternalServerError,
} from "utils/responses.util";
import { getUserIdentifier, isAdmin } from "utils/user.util";
import {
  transformPlaylistsWithSignedUrls,
  transformPlaylistWithSignedUrls,
  transformPlaylistItemsWithSignedUrls,
  transformPlaylistKeyframeEntitiesWithSignedUrls,
} from "utils/transform.util";

/**
 * Handles get playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error getting playlist
 *
 */
export const handleGetPlaylist = async (
  req: RequestType<unknown, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);
  try {
    const playlist = await findOnePlaylistWithoutItems({
      where: { uuid },
      select: getPlaylistSelectedColumns({ featureRank: true }),
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = playlist.user.id === user.id;

    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    // If is hidden and is not allowed to view return not found
    if (playlist.hidden && !isAllowed) {
      return handleNotFound(req as RequestType, res);
    }

    // Check NSFW content access
    if (playlist.nsfw && !user?.nsfw && !isOwner && !isUserAdmin) {
      return handleNotFound(req as RequestType, res);
    }

    /*
     * Check if the user is an admin
     * remove fields from the updateData object if is not an admin
     */
    if (!isAdmin(user)) {
      delete playlist.featureRank;
    }

    if (!playlist.thumbnail) {
      const firstItem = await playlistItemRepository.findOne({
        where: { playlist: { id: playlist.id } },
        relations: {
          dreamItem: true,
          playlistItem: true,
        },
        order: { order: "ASC" },
      });

      const fallbackThumbnail =
        firstItem?.dreamItem?.thumbnail ?? firstItem?.playlistItem?.thumbnail;

      if (fallbackThumbnail) {
        playlist.thumbnail = fallbackThumbnail;
      }
    }

    // Transform playlist to include signed URLs
    const transformedPlaylist = await transformPlaylistWithSignedUrls(playlist);

    // Compute total duration across all playlist items (recursive, non-paginated)
    const totalDurationSeconds = await computePlaylistTotalDurationSeconds(
      playlist.id,
      {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
      },
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          playlist: {
            ...transformedPlaylist,
            totalDurationSeconds,
          },
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get playlist references
 * Playlists Items where current playlist is included as child
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlists
 * BAD_REQUEST 400 - error getting playlists
 *
 */

/**
 * Handles get default playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error getting playlist
 *
 */
export const handleGetDefaultPlaylist = async (
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user!;

  try {
    let defaultPlaylist = await defaultPlaylistRepository.findOne({
      where: {
        user: {
          id: user!.id,
        },
      },
    });

    if (!defaultPlaylist) {
      defaultPlaylist = await computeDefaultPlaylistFromUserId(user?.id);
    }

    const dreams = await populateDefautPlaylist(defaultPlaylist.data);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { dreams },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get playlist items with pagination
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - paginated playlist items
 * BAD_REQUEST 400 - error getting playlist items
 *
 */
export const handleGetPlaylistItems = async (
  req: RequestType<unknown, GetPlaylistItemsQuery, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);

  const take = Math.min(Number(req.query.take) || PAGINATION.TAKE, 5000);
  const skip = Number(req.query.skip) || PAGINATION.SKIP;

  try {
    // First verify the playlist exists and user has access
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      select: { id: true, user: { id: true }, hidden: true },
      relations: { user: true },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = playlist.user.id === user.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    // If is hidden and is not allowed to view return not found
    if (playlist.hidden && !isAllowed) {
      return handleNotFound(req as RequestType, res);
    }

    // Get paginated items
    const result = await getPaginatedPlaylistItems({
      playlistId: playlist.id,
      filter: {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
      },
      take,
      skip,
    });

    // Transform playlist items to include signed URLs
    const transformedItems = await transformPlaylistItemsWithSignedUrls(
      result.items,
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          items: transformedItems,
          totalCount: result.totalCount,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get playlist keyframes with pagination
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - paginated playlist keyframes
 * BAD_REQUEST 400 - error getting playlist keyframes
 *
 */
export const handleGetPlaylistKeyframes = async (
  req: RequestType<unknown, GetPlaylistKeyframesQuery, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);

  const take = Math.min(Number(req.query.take) || PAGINATION.TAKE, 5000);
  const skip = Number(req.query.skip) || PAGINATION.SKIP;

  try {
    // First verify the playlist exists and user has access
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      select: { id: true, user: { id: true }, hidden: true, nsfw: true },
      relations: { user: true },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = playlist.user.id === user.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    // If is hidden and is not allowed to view return not found
    if (playlist.hidden && !isAllowed) {
      return handleNotFound(req as RequestType, res);
    }

    // Check NSFW content access
    if (playlist.nsfw && !user?.nsfw && !isOwner && !isUserAdmin) {
      return handleNotFound(req as RequestType, res);
    }

    // Get paginated keyframes
    const result = await getPaginatedPlaylistKeyframes({
      playlistId: playlist.id,
      take,
      skip,
    });

    const transformedKeyframes =
      await transformPlaylistKeyframeEntitiesWithSignedUrls(result.keyframes);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          keyframes: transformedKeyframes,
          totalCount: result.totalCount,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

export const handleGetPlaylistReferences = async (
  req: RequestType<unknown, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;

  try {
    const references = await playlistItemRepository.find({
      where: {
        playlistItem: {
          uuid,
        },
      },
      select: {
        playlist: {
          id: true,
          uuid: true,
          name: true,
        },
      },
      relations: {
        playlist: true,
      },
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { references } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error getting playlist
 *
 */
export const handleGetPlaylists = async (
  req: RequestType<unknown, GetPlaylistQuery>,
  res: ResponseType,
) => {
  const take = Math.min(Number(req.query.take) || PAGINATION.TAKE, 5000);
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const userUUID: string = req.query.userUUID!;

  const search = req.query?.search
    ? { name: ILike(`%${req.query.search}%`) }
    : undefined;

  try {
    const [playlists, count] = await playlistRepository.findAndCount({
      where: { user: { uuid: userUUID }, ...search },
      select: getPlaylistSelectedColumns(),
      order: { updated_at: "DESC" },
      relations: {
        items: {
          playlistItem: true,
          dreamItem: true,
        },
      },
      take,
      skip,
    });

    for (const pl of playlists) {
      if (!pl?.items || pl.items.length === 0) continue;
      const firstItem = [...pl.items].sort((a, b) => a.order - b.order)[0];
      const firstItemThumb =
        firstItem?.dreamItem?.thumbnail ?? firstItem?.playlistItem?.thumbnail;

      if (!firstItemThumb) continue;

      const childThumbs = new Set(
        (pl.items || [])
          .flatMap((it) => [
            it?.dreamItem?.thumbnail,
            it?.playlistItem?.thumbnail,
          ])
          .filter(Boolean) as string[],
      );

      if (
        !pl.thumbnail ||
        (childThumbs.has(pl.thumbnail) && pl.thumbnail !== firstItemThumb)
      ) {
        pl.thumbnail = firstItemThumb;
      }
    }

    // Transform playlists to include signed URLs
    const transformedPlaylists =
      await transformPlaylistsWithSignedUrls(playlists);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { playlists: transformedPlaylists, count },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error creating playlist
 *
 */
export const handleCreatePlaylist = async (
  req: RequestType<CreatePlaylistRequest>,
  res: ResponseType,
) => {
  const { name, description, nsfw, hidden } = req.body;
  const user = res.locals.user!;

  try {
    // create playlist
    const playlist = new Playlist();
    playlist.name = name;
    playlist.description = description ?? "";
    playlist.nsfw = nsfw ?? false;
    playlist.hidden = hidden ?? false;
    playlist.user = user!;
    const createdPlaylist = await playlistRepository.save(playlist);

    /**
     * create feed item when playlist is created
     */
    const feedRepository = appDataSource.getRepository(FeedItem);

    const feedItem = new FeedItem();
    feedItem.type = FeedItemType.PLAYLIST;
    feedItem.user = createdPlaylist.user;
    feedItem.playlistItem = createdPlaylist;
    feedItem.created_at = createdPlaylist.created_at;
    feedItem.updated_at = createdPlaylist.updated_at;

    await feedRepository.save(feedItem);

    tracker.sendEventWithRequestContext(res, user.uuid, "PLAYLIST_CREATED", {
      playlist_uuid: playlist.uuid,
    });

    return res
      .status(httpStatus.CREATED)
      .json(
        jsonResponse({ success: true, data: { playlist: createdPlaylist } }),
      );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles update playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error updating playlist
 *
 */
export const handleUpdatePlaylist = async (
  req: RequestType<UpdatePlaylistRequest, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);

  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      filter: {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const { displayedOwner: _displayedOwner, ...sanitizedData } = req.body;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Playlist> = sanitizedData as Omit<
      UpdatePlaylistRequest,
      "displayedOwner"
    >;

    let displayedOwner: User | null = null;
    if (isAdmin(user) && req.body.displayedOwner) {
      displayedOwner = await userRepository.findOneBy({
        id: req.body.displayedOwner,
      });
    }

    /**
     * update displayed owner for playlist and feed item
     */
    if (displayedOwner) {
      updateData = { ...updateData, displayedOwner: displayedOwner };
      /**
       * update feed item user too
       */
      await feedItemRepository.update(
        { playlistItem: { id: playlist.id } },
        { user: displayedOwner },
      );
    }

    if (!isAdmin(user)) {
      /*
       * Check if the user is an admin
       * remove fields from the updateData object if is not an admin
       */
      updateData = { ...updateData };
    }

    await playlistRepository.update(playlist.id, {
      ...updateData,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { playlist: { ...playlist, ...updateData } },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles update thumbnail playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - thumbnail playlist updated
 * BAD_REQUEST 400 - error updating playlist thumbnail
 *
 */
export const handleUpdateThumbnailPlaylist = async (
  req: RequestType<unknown, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const uuid: string = req.params.uuid!;
  const isUserAdmin = isAdmin(user);

  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // update playlist
    const thumbnailBuffer = req.file?.buffer;
    const bucketName = env.R2_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension =
      MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.JPEG];
    const fileName = `${THUMBNAIL}.${fileExtension}`;
    const filePath = `${getUserIdentifier(user)}/${PLAYLIST_PREFIX}-${
      playlist.id
    }/${fileName}`;

    if (thumbnailBuffer) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        Body: thumbnailBuffer,
        ContentType: fileMymeType || "image/jpeg",
        CacheControl: "no-cache",
        Expires: new Date(),
      });
      await r2Client.send(command);
    }

    const newThumbnail = thumbnailBuffer ? filePath : null;

    await playlistRepository.update(
      { id: playlist.id },
      { thumbnail: newThumbnail },
    );

    playlist.thumbnail = newThumbnail;

    const transformedPlaylist = await transformPlaylistWithSignedUrls(playlist);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { playlist: transformedPlaylist },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles delete playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error deleting playlist
 *
 */
export const handleDeletePlaylist = async (
  req: RequestType<unknown, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const affected = await playlistRepository.softRemove(playlist);

    if (!affected) {
      return handleNotFound(req as RequestType, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error updating playlist
 *
 */

export const handleOrderPlaylist = async (
  req: RequestType<OrderPlaylistRequest, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const order = req.body.order!;

  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * update item order
     */
    for (const item of order) {
      await playlistItemRepository.update(
        {
          id: item.id,
          playlist: {
            id: playlist.id,
          },
        },
        { order: item.order },
      );
    }

    /**
     * playlist updated_at updated after ordering
     */
    await refreshPlaylistUpdatedAtTimestamp(playlist.id);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles add item to playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error adding playlist item
 *
 */
export const handleAddPlaylistItem = async (
  req: RequestType<AddPlaylistItemRequest, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const type = req.body.type!;
  const itemUUID = req.body.uuid!;
  const user = res.locals.user!;

  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * Handle adding playlist itself
     */
    if (PlaylistItemType.PLAYLIST && playlist.uuid === itemUUID) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * Handle duplicated item
     */
    const playlistSearch =
      type === PlaylistItemType.DREAM
        ? { dreamItem: { uuid: itemUUID } }
        : { playlistItem: { uuid: itemUUID } };

    let [playlistItem] = await playlistItemRepository.find({
      where: { playlist: { uuid }, type: type, ...playlistSearch },
    });

    if (playlistItem) {
      return res.status(httpStatus.CONFLICT).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.DUPLICATED,
        }),
      );
    }

    /**
     * Creating playlist item
     */
    playlistItem = new PlaylistItem();
    playlistItem.playlist = playlist;
    playlistItem.type = type!;

    /**
     * Set the order of the new item based on the current number of items in the playlist
     */
    const itemsCount = await playlistItemRepository.count({
      where: {
        playlist: { id: playlist.id },
      },
    });
    playlistItem.order = itemsCount;

    let shouldUpdatePlaylistTimestamp = false;

    if (type === PlaylistItemType.DREAM) {
      const dreamToAdd = await dreamRepository.findOne({
        where: { uuid: itemUUID },
      });

      if (!dreamToAdd) {
        return handleNotFound(req as RequestType, res);
      }

      playlistItem.dreamItem = dreamToAdd;
      shouldUpdatePlaylistTimestamp =
        dreamToAdd.status === DreamStatusType.PROCESSED;
    } else if (type === PlaylistItemType.PLAYLIST) {
      const playlistToAdd = await playlistRepository.findOne({
        where: { uuid: itemUUID },
      });

      if (!playlistToAdd) {
        return handleNotFound(req as RequestType, res);
      }

      playlistItem.playlistItem = playlistToAdd;
    }

    const createdPlaylistItem = await playlistItemRepository.save(playlistItem);

    if (shouldUpdatePlaylistTimestamp) {
      refreshPlaylistUpdatedAtTimestamp(playlist.id);
    }

    tracker.sendEventWithRequestContext(res, user.uuid, "PLAYLIST_ITEM_ADDED", {
      playlist_uuid: playlist.uuid,
    });

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { playlistItem: createdPlaylistItem },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles remove item from playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error deleting playlist item
 *
 */
export const handleRemovePlaylistItem = async (
  req: RequestType<unknown, unknown, RemovePlaylistItemRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const itemId: number = req.params.itemId!;
  const user = res.locals.user!;
  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });
    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const playlistItem = await playlistItemRepository.findOne({
      where: { id: itemId, playlist: { id: playlist.id } },
    });

    if (!playlistItem) {
      return handleNotFound(req as RequestType, res);
    }

    // Delete item and reset order
    await deletePlaylistItemAndResetOrder({
      playlistId: playlist.id,
      itemIdToDelete: playlistItem.id,
    });
    await refreshPlaylistUpdatedAtTimestamp(playlist.id);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles add keyframe to playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error adding playlist keyframe
 *
 */
export const handleAddPlaylistKeyframe = async (
  req: RequestType<AddPlaylistKeyframeRequest, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const keyframeUUID = req.body.uuid!;
  const user = res.locals.user!;

  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * Handle duplicated keyframe
     */
    let [playlistKeyframe] = await playlistKeyframeRepository.find({
      where: { playlist: { uuid }, keyframe: { uuid: keyframeUUID } },
    });

    if (playlistKeyframe) {
      return res.status(httpStatus.CONFLICT).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.DUPLICATED,
        }),
      );
    }

    /**
     * Creating playlist keyframe
     */
    playlistKeyframe = new PlaylistKeyframe();
    playlistKeyframe.playlist = playlist;

    /**
     * Set the order of the new keyframe based on the current number of keyframes in the playlist
     */
    const keyframeCount = await playlistKeyframeRepository.count({
      where: {
        playlist: { id: playlist.id },
      },
    });
    playlistKeyframe.order = keyframeCount || 0;

    const keyframeToAdd = await keyframeRepository.findOne({
      where: { uuid: keyframeUUID },
    });

    if (!keyframeToAdd) {
      return handleNotFound(req as RequestType, res);
    }

    playlistKeyframe.keyframe = keyframeToAdd;

    const createdPlaylistKeyframe =
      await playlistKeyframeRepository.save(playlistKeyframe);

    refreshPlaylistUpdatedAtTimestamp(playlist.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { playlist: __, ...plKeyframe } = createdPlaylistKeyframe;

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { playlistKeyframe: plKeyframe },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles remove keyframe from playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error deleting playlist keyframe
 *
 */
export const handleRemovePlaylistKeyframe = async (
  req: RequestType<unknown, unknown, RemovePlaylistKeyframeRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const playlistKeyframeId: number = req.params.playlistKeyframeId!;
  const user = res.locals.user!;
  try {
    const playlist = await playlistRepository.findOne({
      where: { uuid },
      // only need to query the user id
      select: { user: { id: true } },
      relations: {
        user: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const playlistKeyframe = await playlistKeyframeRepository.findOne({
      where: { id: playlistKeyframeId, playlist: { id: playlist.id } },
    });

    if (!playlistKeyframe) {
      return handleNotFound(req as RequestType, res);
    }

    // Delete keyframe and reset order
    await deletePlaylistKeyframeAndResetOrder({
      playlistId: playlist.id,
      playlistKeyframeId: playlistKeyframe.id,
    });
    await refreshPlaylistUpdatedAtTimestamp(playlist.id);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
