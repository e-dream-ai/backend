import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
import { MYME_TYPES, MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { THUMBNAIL } from "constants/multimedia.constants";
import { PAGINATION } from "constants/pagination.constants";
import { PLAYLIST_PREFIX } from "constants/playlist.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Dream, FeedItem, Playlist, PlaylistItem, User } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { ILike } from "typeorm";
import { DreamStatusType } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import {
  AddPlaylistItemRequest,
  CreatePlaylistRequest,
  OrderPlaylistRequest,
  PlaylistItemType,
  PlaylistParamsRequest,
  RemovePlaylistItemRequest,
  UpdatePlaylistRequest,
} from "types/playlist.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  findOnePlaylist,
  getPlaylistSelectedColumns,
  refreshPlaylistUpdatedAtTimestamp,
} from "utils/playlist.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
  handleInternalServerError,
} from "utils/responses.util";
import { isAdmin } from "utils/user.util";

const playlistRepository = appDataSource.getRepository(Playlist);
const playlistItemRepository = appDataSource.getRepository(PlaylistItem);
const dreamRepository = appDataSource.getRepository(Dream);
const feedItemRepository = appDataSource.getRepository(FeedItem);
const userRepository = appDataSource.getRepository(User);

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
  const user = res.locals.user;
  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      filter: { nsfw: user?.nsfw },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    /*
     * Check if the user is an admin
     * remove fields from the updateData object if is not an admin
     */
    if (!isAdmin(user)) {
      delete playlist.featureRank;
    }

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { playlist } }));
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
  req: RequestType,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const userId = Number(req.query.userId) || undefined;

  const search = req.query?.search
    ? { name: ILike(`%${req.query.search}%`) }
    : undefined;

  try {
    const [playlists, count] = await playlistRepository.findAndCount({
      where: { user: { id: userId }, ...search },
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

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { playlists, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  const { name, nsfw } = req.body;
  const user = res.locals.user;

  try {
    // create playlist
    const playlist = new Playlist();
    playlist.name = name;
    playlist.nsfw = nsfw ?? false;
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

  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      filter: { nsfw: user?.nsfw },
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

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Playlist> = {
      ...(req.body as Omit<UpdatePlaylistRequest, "displayedOwner">),
    };

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

    const updatedPlaylist = await findOnePlaylist({
      where: { id: playlist.id },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      filter: { nsfw: user?.nsfw },
    });

    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { playlist: updatedPlaylist } }),
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

  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: { nsfw: user?.nsfw },
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
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension =
      MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.JPEG];
    const fileName = `${THUMBNAIL}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${PLAYLIST_PREFIX}-${playlist.id}/${fileName}`;

    if (thumbnailBuffer) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        Body: thumbnailBuffer,
        ACL: BUCKET_ACL,
        CacheControl: "no-cache",
        Expires: new Date(),
      });
      await s3Client.send(command);
    }

    const updatedPlaylist = await playlistRepository.save({
      ...playlist,
      thumbnail: thumbnailBuffer ? generateBucketObjectURL(filePath) : null,
    });

    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { playlist: updatedPlaylist } }),
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
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: { nsfw: user?.nsfw },
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
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: { nsfw: user?.nsfw },
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
 * BAD_REQUEST 400 - error deleting playlist
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
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: { nsfw: user?.nsfw },
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
    playlistItem.order = (playlist.items?.length || 0) + 1;

    let shouldUpdatePlaylistTimestamp = false;

    if (type === PlaylistItemType.DREAM) {
      const dreamToAdd = await dreamRepository.findOne({
        where: { uuid: itemUUID },
      });

      console.log({ dreamToAdd });

      if (!dreamToAdd) {
        return handleNotFound(req as RequestType, res);
      }

      playlistItem.dreamItem = dreamToAdd;
      shouldUpdatePlaylistTimestamp =
        dreamToAdd.status === DreamStatusType.PROCESSED;
    } else if (type === PlaylistItemType.PLAYLIST) {
      const playlistToAdd = await findOnePlaylist({
        where: { uuid: itemUUID },
        select: getPlaylistSelectedColumns(),
        filter: { nsfw: user?.nsfw },
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
 * Handles remove item to playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * BAD_REQUEST 400 - error deleting playlist
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
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns(),
      filter: { nsfw: user?.nsfw },
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

    await playlistItemRepository.softRemove(playlistItem);
    await refreshPlaylistUpdatedAtTimestamp(playlist.id);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
