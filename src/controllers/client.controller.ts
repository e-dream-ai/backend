import { tracker } from "clients/google-analytics";
import {
  defaultPlaylistRepository,
  dreamRepository,
  voteRepository,
} from "database/repositories";
import httpStatus from "http-status";
import { In, Not } from "typeorm";
import {
  ClientDream,
  ClientPlaylist,
  GetDreamsQuery,
  GetDreamsRequestQuery,
} from "types/client.types";
import { DreamMediaType, DreamParamsRequest } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { PlaylistParamsRequest } from "types/playlist.types";
import { VoteType } from "types/vote.types";
import {
  formatClientDream,
  formatClientPlaylist,
  populateDefautPlaylist,
} from "utils/client.util";
import { computeDefaultPlaylistFromUserId } from "utils/default-playlist.util";
import { getDreamSelectedColumns } from "utils/dream.util";
import {
  findOnePlaylist,
  getPlaylistSelectedColumns,
} from "utils/playlist.util";
import {
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";
import {
  transformDreamWithSignedUrls,
  transformDreamsWithSignedUrls,
  transformPlaylistWithSignedUrls,
} from "utils/transform.util";
import {
  getUserDownvotedDreams,
  isAdmin,
  reduceUserQuota,
  setUserLastClientPingAt,
} from "utils/user.util";

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
  const user = res.locals.user!;
  const quota: number = Number(user?.quota ?? 0);
  const clientVersion = res.locals.requestContext?.version;

  /**
   * Count total user dislikes
   */
  const dislikesCount = await voteRepository.count({
    where: { user: { id: user.id }, vote: VoteType.DOWNVOTE },
  });

  /**
   *  if there's no playlist, will return empty string ""
   */
  const currentPlaylistUUID = user?.currentPlaylist?.uuid ?? "";

  /**
   * Send event to GA
   */
  tracker.sendEventWithRequestContext(res, user.uuid, "CLIENT_HELLO", {});

  /**
   * Save last seen client ping + version
   */
  await setUserLastClientPingAt(user, clientVersion);

  try {
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          quota,
          currentPlaylistUUID,
          dislikesCount,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

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

    const playlist = await populateDefautPlaylist(defaultPlaylist.data);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { playlist },
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
  req: RequestType<unknown, unknown, PlaylistParamsRequest>,
  res: ResponseType,
) => {
  const uuid = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);

  try {
    const playlist = await findOnePlaylist({
      where: { uuid },
      select: getPlaylistSelectedColumns({ featureRank: true }),
      /**
       * Filter to get only processed dreams for client
       */
      filter: {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
        onlyProcessedDreams: true,
      },
    });

    if (!playlist) {
      return handleNotFound(req as RequestType, res);
    }

    const transformedPlaylist = await transformPlaylistWithSignedUrls(playlist);

    const clientPlaylist: ClientPlaylist =
      formatClientPlaylist(transformedPlaylist);

    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { playlist: clientPlaylist } }),
      );
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
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = req.params.uuid!;

  try {
    const [dream] = await dreamRepository.find({
      where: {
        uuid: dreamUUID!,
        mediaType: Not(DreamMediaType.IMAGE),
      },
      relations: { user: true, displayedOwner: true, playlistItems: true },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
      }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    await reduceUserQuota(user!, dream?.processedVideoSize ?? 0);

    // Transform dream to include presigned URLs
    const transformedDream = await transformDreamWithSignedUrls(dream);
    const url = transformedDream.video;

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
      where: {
        uuid: In(uuids),
        mediaType: Not(DreamMediaType.IMAGE), // Exclude image dreams for native client
      },
      relations: {
        user: true,
        displayedOwner: true,
        playlistItems: true,
      },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
        filmstrip: false,
      }),
    });

    // Transform dreams to include signed URLs
    const transformedDreams = await transformDreamsWithSignedUrls(dreams);

    const clientDreams: ClientDream[] = transformedDreams?.map((dream) =>
      formatClientDream(dream),
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          dreams: clientDreams,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dreams with a post request
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleDreamsRequest = async (
  req: RequestType<GetDreamsRequestQuery>,
  res: ResponseType,
) => {
  const uuids: string[] = (req.body.uuids as string[]) ?? [];

  try {
    const dreams = await dreamRepository.find({
      where: {
        uuid: In(uuids),
        mediaType: Not(DreamMediaType.IMAGE), // Exclude image dreams for native client
      },
      relations: {
        user: true,
        displayedOwner: true,
        playlistItems: true,
      },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
      }),
    });

    // Transform dreams to include signed URLs
    const transformedDreams = await transformDreamsWithSignedUrls(dreams);

    const clientDreams: ClientDream[] = transformedDreams?.map((dream) =>
      formatClientDream(dream),
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          dreams: clientDreams,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get list of dream dislikes
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - disliked dreams
 * BAD_REQUEST 400 - error getting disliked dreams
 *
 */
export const handleGetUserDislikes = async (
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  /**
   * Calculate downvoted uuids
   */
  const dislikes = await getUserDownvotedDreams(user);

  try {
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          dislikes,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get user quota
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - quota data
 * BAD_REQUEST 400 - error getting quota
 *
 */
export const handleQuota = async (req: RequestType, res: ResponseType) => {
  const user = res.locals.user!;
  const quota: number = Number(user?.quota ?? 0);

  try {
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          quota,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dreams with a post request
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleTelemetry = async (req: RequestType, res: ResponseType) => {
  try {
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
