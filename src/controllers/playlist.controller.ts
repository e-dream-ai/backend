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
import { Dream, FeedItem, Playlist, PlaylistItem } from "entities";
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
import { jsonResponse } from "utils/responses.util";

const playlistRepository = appDataSource.getRepository(Playlist);
const playlistItemRepository = appDataSource.getRepository(PlaylistItem);

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
  try {
    const [playlist] = await playlistRepository.find({
      where: { id },
      select: getPlaylistSelectedColumns(),
      relations: {
        user: true,
        items: { playlistItem: { user: true }, dreamItem: { user: true } },
      },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
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
      select: getPlaylistSelectedColumns(),
      relations: {
        user: true,
        items: { playlistItem: { user: true }, dreamItem: { user: true } },
      },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
    }

    const updatedPlaylist = await playlistRepository.save({
      ...playlist,
      ...req.body,
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
      relations: { user: true },
    });

    if (!playlist) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
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
      relations: { user: true, playlistItems: true, feedItem: true },
    });

    if (!playlist) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
    }

    const affected = await playlistRepository.softRemove(playlist);

    if (!affected) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
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
      relations: { user: true, items: true },
      order: { items: { order: "ASC" } },
    });

    if (!playlist) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
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
      relations: { user: true, items: true },
    });

    if (!playlist) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
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
        return res.status(httpStatus.NOT_FOUND).json(
          jsonResponse({
            success: false,
            message: GENERAL_MESSAGES.NOT_FOUND,
          }),
        );
      }

      playlistItem.dreamItem = dreamToAdd;
    } else if (type === PlaylistItemType.PLAYLIST) {
      const [playlistToAdd] = await playlistRepository.find({
        where: { id: itemId },
      });

      if (!playlistToAdd) {
        return res.status(httpStatus.NOT_FOUND).json(
          jsonResponse({
            success: false,
            message: GENERAL_MESSAGES.NOT_FOUND,
          }),
        );
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
      relations: { user: true },
    });

    if (!playlist) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: playlist.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
    }

    const { affected } = await playlistItemRepository.softDelete({
      id: itemId,
      playlist: { id: playlist.id },
    });

    if (!affected) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
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
