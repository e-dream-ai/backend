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
import { APP_LOGGER } from "shared/logger";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import {
  AddPlaylistItemRequest,
  CreatePlaylistRequest,
  OrderPlaylistRequest,
  PlaylistItemType,
  UpdatePlaylistRequest,
} from "types/playlist.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { canExecuteAction } from "utils/permissions.util";
import { getPlaylistSelectedColumns } from "utils/playlist.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
} from "utils/responses.util";
import { isAdmin } from "utils/user.util";

const playlistRepository = appDataSource.getRepository(Playlist);
const playlistItemRepository = appDataSource.getRepository(PlaylistItem);
const feedItemRepository = appDataSource.getRepository(FeedItem);
const userRepository = appDataSource.getRepository(User);

/**
 * Handles get playlists
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlists
 * BAD_REQUEST 400 - error getting playlists
 *
 */
export const handleGetMyPlaylists = async (
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user;

  try {
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.MAX_TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;

    const query = playlistRepository
      .createQueryBuilder("playlist")
      .leftJoinAndSelect("playlist.user", "user")
      .leftJoinAndSelect("playlist.items", "item")
      .where({ user: { id: user?.id } });

    const count = await query.getCount();

    const playlists = await query
      .loadRelationCountAndMap("playlist.itemCount", "playlist.items")
      .skip(skip)
      .take(take)
      .getMany();

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { playlists, count } }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
export const handleGetPlaylist = async (
  req: RequestType,
  res: ResponseType,
) => {
  const id: number = Number(req.params?.id) || 0;
  const user = res.locals.user;
  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      relations: {
        user: true,
        displayedOwner: true,
        items: {
          playlistItem: { user: true, displayedOwner: true },
          dreamItem: { user: true, displayedOwner: true },
        },
      },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return handleNotFound(req, res);
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
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  const { name } = req.body;
  const user = res.locals.user;

  try {
    // create playlist
    const playlist = new Playlist();
    playlist.name = name;
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
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
export const handleUpdatePlaylist = async (
  req: RequestType<UpdatePlaylistRequest>,
  res: ResponseType,
) => {
  const id: number = Number(req.params.id) || 0;
  const user = res.locals.user;

  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      relations: {
        user: true,
        displayedOwner: true,
        items: {
          playlistItem: { user: true, displayedOwner: true },
          dreamItem: { user: true, displayedOwner: true },
        },
      },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
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

    const updatedPlaylist = await playlistRepository.findOne({
      where: { id: playlist.id },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      relations: {
        user: true,
        displayedOwner: true,
        items: {
          playlistItem: { user: true, displayedOwner: true },
          dreamItem: { user: true, displayedOwner: true },
        },
      },
    });

    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { playlist: updatedPlaylist } }),
      );
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const id: number = Number(req.params.id) || 0;

  try {
    const [playlist] = await playlistRepository.find({
      where: { id: id! },
      select: getPlaylistSelectedColumns(),
      relations: { user: true, displayedOwner: true },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    // update playlist
    const thumbnailBuffer = req.file?.buffer;
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension =
      MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.JPEG];
    const fileName = `${THUMBNAIL}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${PLAYLIST_PREFIX}-${id}/${fileName}`;

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
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType,
  res: ResponseType,
) => {
  const id: number = Number(req.params?.id) || 0;
  const user = res.locals.user;
  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns(),
      relations: {
        user: true,
        displayedOwner: true,
        playlistItems: true,
        feedItem: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    const affected = await playlistRepository.softRemove(playlist);

    if (!affected) {
      return handleNotFound(req, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType<OrderPlaylistRequest>,
  res: ResponseType,
) => {
  const id: number = Number(req.params.id) || 0;
  const user = res.locals.user;
  const order = req.body.order!;

  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns(),
      relations: {
        user: true,
        displayedOwner: true,
        items: {
          playlistItem: { user: true, displayedOwner: true },
          dreamItem: { user: true, displayedOwner: true },
        },
      },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    playlist.items = playlist.items.map((item) => {
      const reorderItem = order.find((i) => i.id === item.id);
      if (!reorderItem) return item;

      return {
        ...item,
        order: reorderItem.order!,
      };
    });

    await playlistRepository.save(playlist);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { playlist } }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType<AddPlaylistItemRequest>,
  res: ResponseType,
) => {
  const id: number = Number(req.params?.id) || 0;
  const { type, id: item } = req.body;
  const itemId = Number(item) ?? 0;
  const user = res.locals.user;

  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns(),
      relations: {
        user: true,
        displayedOwner: true,
        items: {
          playlistItem: { user: true, displayedOwner: true },
          dreamItem: { user: true, displayedOwner: true },
        },
      },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    if (PlaylistItemType.PLAYLIST && id === itemId) {
      return res
        .status(httpStatus.FORBIDDEN)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.FORBIDDEN }),
        );
    }

    const playlistSearch =
      type === PlaylistItemType.DREAM
        ? { dreamItem: { id: itemId } }
        : { playlistItem: { id: itemId } };

    let [playlistItem] = await playlistItemRepository.find({
      where: { playlist: { id }, type: type, ...playlistSearch },
    });

    if (playlistItem) {
      return res.status(httpStatus.CONFLICT).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.DUPLICATED,
        }),
      );
    }

    playlistItem = new PlaylistItem();
    playlistItem.playlist = playlist;
    playlistItem.type = type!;
    playlistItem.order = (playlist.items?.length || 0) + 1;

    if (type === PlaylistItemType.DREAM) {
      const dreamRepository = appDataSource.getRepository(Dream);
      const [dreamToAdd] = await dreamRepository.find({
        where: { id: itemId },
      });

      if (!dreamToAdd) {
        return handleNotFound(req, res);
      }

      playlistItem.dreamItem = dreamToAdd;
    } else if (type === PlaylistItemType.PLAYLIST) {
      const [playlistToAdd] = await playlistRepository.find({
        where: { id: itemId },
      });

      if (!playlistToAdd) {
        return handleNotFound(req, res);
      }

      playlistItem.playlistItem = playlistToAdd;
    }

    const createdPlaylistItem = await playlistItemRepository.save(playlistItem);

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { playlistItem: createdPlaylistItem },
      }),
    );
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType,
  res: ResponseType,
) => {
  const id: number = Number(req.params?.id) || 0;
  const itemId: number = Number(req.params?.itemId) || 0;
  const user = res.locals.user;
  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns(),
      relations: { user: true, displayedOwner: true },
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    const { affected } = await playlistItemRepository.softDelete({
      id: itemId,
      playlist: { id: playlist.id },
    });

    if (!affected) {
      return handleNotFound(req, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (error) {
    APP_LOGGER.error(error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
  }
};
