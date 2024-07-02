import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import httpStatus from "http-status";
import { In } from "typeorm";
import { GetDreamsQuery } from "types/client.types";
import { GetDreamQuery } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { getDreamSelectedColumns } from "utils/dream.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  findOnePlaylist,
  getPlaylistSelectedColumns,
} from "utils/playlist.util";
import { isBrowserRequest } from "utils/request.util";
import {
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";
import { isAdmin } from "utils/user.util";

/**
 * Repositories
 */
const dreamRepository = appDataSource.getRepository(Dream);

/**
 * Handles hello
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - hello data
 * BAD_REQUEST 400 - error getting hello data
 *
 */
export const handleHello = async (req: RequestType, res: ResponseType) => {
  const user = res.locals.user;
  const quota: number = Number(user?.quota ?? 0);
  const currentPlaylistId = user?.currentPlaylist?.id;

  try {
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          quota,
          currentPlaylistId,
        },
      }),
    );
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
export const handleGetPlaylist = async (
  req: RequestType,
  res: ResponseType,
) => {
  const id = Number(req.params.id) || 0;
  const user = res.locals?.user;

  try {
    const playlist = await findOnePlaylist({
      where: { id },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      filter: { nsfw: user?.nsfw },
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
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get download url
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - url
 * BAD_REQUEST 400 - error getting url
 *
 */
export const handleGetDownloadUrl = async (
  req: RequestType<GetDreamQuery>,
  res: ResponseType,
) => {
  const isBrowser = isBrowserRequest(req as RequestType);
  const user = res.locals.user;
  const dreamUUID: string = String(req.params?.uuid);

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, displayedOwner: true, playlistItems: true },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
      }),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    /**
     * remove original video if is not admin or owner or browser requested
     */
    if (!isAllowed || !isBrowser) {
      delete dream.original_video;
    }

    /*
     * Check if the user is an admin
     * remove fields from the updateData object if is not an admin
     */
    if (!isAdmin(user)) {
      delete dream.featureRank;
    }

    const url = dream.video;

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { url } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dreams
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetDreams = async (
  req: RequestType<unknown, GetDreamsQuery>,
  res: ResponseType,
) => {
  const uuids: string[] = req.query.uuids ? req.query.uuids?.split(",") : [];

  try {
    const dreams = await dreamRepository.find({
      where: { uuid: In(uuids) },
      relations: { user: true, displayedOwner: true, playlistItems: true },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
      }),
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          dreams,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
