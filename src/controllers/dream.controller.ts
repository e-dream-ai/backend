import { PutObjectCommand } from "@aws-sdk/client-s3";
import { tracker } from "clients/google-analytics";
import { r2Client } from "clients/r2.client";

import {
  FILE_EXTENSIONS,
  MYME_TYPES,
  MYME_TYPES_EXTENSIONS,
} from "constants/file.constants";
import {
  DEFAULT_QUEUE,
  TURN_OFF_QUANTITY,
  TURN_ON_QUANTITY,
} from "constants/job.constants";
import { DREAM_MESSAGES } from "constants/messages/dream.constants";
import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import {
  dreamRepository,
  userRepository,
  feedItemRepository,
  voteRepository,
  keyframeRepository,
  reportRepository,
} from "database/repositories";
import { Dream, Keyframe, Report, User } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import {
  AbortMultipartUploadDreamRequest,
  CompleteMultipartUploadDreamRequest,
  CreateDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreateMultipartUploadFileRequest,
  DreamFileType,
  DreamMediaType,
  DreamParamsRequest,
  DreamStatusType,
  Frame,
  GetDreamsQuery,
  RefreshMultipartUploadUrlRequest,
  SetDreamStatusFailedRequest,
  UpdateDreamProcessedRequest,
  UpdateDreamRequest,
} from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { VoteType } from "types/vote.types";
import {
  createFeedItem,
  findDreamPlaylistItems,
  getDreamSelectedColumns,
  handleVoteDream,
  processDreamRequest,
} from "utils/dream.util";
import { isImageGenerationAlgorithm } from "utils/prompt.util";
import { getQueueValues, updateVideoServiceWorker } from "utils/job.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  refreshPlaylistUpdatedAtTimestampFromPlaylistItems,
  computePlaylistThumbnailRecursive,
} from "utils/playlist.util";
import { isBrowserRequest } from "utils/request.util";
import {
  jsonResponse,
  handleInternalServerError,
  handleNotFound,
  handleForbidden,
} from "utils/responses.util";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  generateDreamPath,
  generateFilmstripPath,
  generateThumbnailPath,
  getUploadPartSignedUrl,
} from "utils/r2.util";
import { truncateString } from "utils/string.util";
import { getUserIdentifier, isAdmin } from "utils/user.util";
import { framesToSeconds } from "utils/video.utils";
import {
  transformDreamWithSignedUrls,
  transformDreamsWithSignedUrls,
} from "utils/transform.util";
import { detectMediaTypeFromExtension } from "utils/media.util";

/**
 * Handles get dreams
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams
 * BAD_REQUEST 400 - error getting dream
 *
 */
export const handleGetDreams = async (
  req: RequestType<unknown, GetDreamsQuery>,
  res: ResponseType,
) => {
  try {
    const isBrowser = isBrowserRequest(req as RequestType);
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.MAX_TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;
    const status =
      (req.query.status as DreamStatusType) || DreamStatusType.PROCESSED;
    const userUUID = req.query.userUUID;

    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { uuid: userUUID }, status },
      relations: { user: true, displayedOwner: true },
      select: getDreamSelectedColumns({
        originalVideo: isBrowser,
        filmstrip: false,
      }),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const transformedDreams = await transformDreamsWithSignedUrls(dreams);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { dreams: transformedDreams, count },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

export const handleCreateDream = async (
  req: RequestType<CreateDreamRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user!;

  try {
    const name = truncateString(req.body.name, 1000, false);
    const description = req.body.description;
    const sourceUrl = req.body.sourceUrl;
    const nsfw = req.body.nsfw;
    const hidden = req.body.hidden;
    const ccbyLicense = req.body.ccbyLicense;
    const prompt = req.body.prompt
      ? typeof req.body.prompt === "string"
        ? req.body.prompt
        : JSON.stringify(req.body.prompt)
      : undefined;

    let mediaType = req.body.mediaType;
    if (!mediaType && prompt) {
      try {
        const parsedPrompt =
          typeof prompt === "string" ? JSON.parse(prompt) : prompt;
        if (parsedPrompt?.infinidream_algorithm) {
          const algorithm = parsedPrompt.infinidream_algorithm;
          if (isImageGenerationAlgorithm(algorithm)) {
            mediaType = DreamMediaType.IMAGE;
          }
        }
      } catch (error) {
        // If prompt parsing fails, continue with default mediaType
        // Error is intentionally ignored as we fall back to default VIDEO mediaType
      }
    }
    mediaType = mediaType ?? DreamMediaType.VIDEO;

    if (mediaType === DreamMediaType.IMAGE && !prompt) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message:
            "Image dreams require either a prompt for AI generation or a file upload via multipart upload",
        }),
      );
    }

    const dream = new Dream();
    dream.name = name;
    dream.description = description;
    dream.sourceUrl = sourceUrl;
    dream.prompt = prompt ?? null;
    dream.user = user;
    dream.nsfw = nsfw ?? false;
    dream.hidden = hidden ?? false;
    dream.ccbyLicense = ccbyLicense ?? false;
    dream.mediaType = mediaType;
    dream.status = DreamStatusType.QUEUE;

    await dreamRepository.save(dream);

    const processResult = await processDreamRequest(dream);

    if (!processResult?.isPromptBased) {
      await updateVideoServiceWorker(TURN_ON_QUANTITY);
    }

    const [savedDream] = await dreamRepository.find({
      where: { uuid: dream.uuid },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    tracker.sendEventWithRequestContext(
      res,
      user.uuid,
      "USER_NEW_DREAM_FROM_PROMPT",
      {},
    );

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: savedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create multipart upload with presigned urls to post
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCreateMultipartUpload = async (
  req: RequestType<CreateMultipartUploadDreamRequest>,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user!;
  let dream: Dream;

  try {
    const dreamUUID = req.body.uuid;
    // truncate string to 1000 characters
    const name = truncateString(req.body.name, 1000, false);
    const description = req.body.description;
    const sourceUrl = req.body.sourceUrl;
    const extension = req.body.extension;
    const parts = req.body.parts ?? 1;
    const nsfw = req.body.nsfw;
    const hidden = req.body.hidden;
    const ccbyLicense = req.body.ccbyLicense;
    const mediaType =
      req.body.mediaType ??
      (extension
        ? detectMediaTypeFromExtension(extension)
        : DreamMediaType.VIDEO);

    if (!dreamUUID) {
      // create dream
      dream = new Dream();
      dream.name = name;
      dream.description = description;
      dream.sourceUrl = sourceUrl;
      dream.user = user!;
      dream.nsfw = nsfw ?? false;
      dream.hidden = hidden ?? false;
      dream.ccbyLicense = ccbyLicense ?? false;
      dream.mediaType = mediaType;
      await dreamRepository.save(dream);
    } else {
      // find dream
      [dream] = await dreamRepository.find({
        where: { uuid: dreamUUID! },
        relations: { user: true, playlistItems: true },
        select: getDreamSelectedColumns({ originalVideo: true }),
      });
    }

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const uuid = dream.uuid;
    const fileExtension = extension;
    const fileName = `${uuid}.${fileExtension}`;
    const filePath = `${getUserIdentifier(user)}/${uuid}/${fileName}`;
    const uploadId = await createMultipartUpload(filePath);
    const arrayUrls = Array.from({ length: parts });
    const urls = await Promise.all(
      arrayUrls.map(
        async (_, index) =>
          await getUploadPartSignedUrl(filePath, uploadId!, index + 1),
      ),
    );
    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { urls, dream: dream, uploadId },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create multipart upload with presigned urls to post for dream files
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCreateMultipartUploadDreamFile = async (
  req: RequestType<
    CreateMultipartUploadFileRequest,
    unknown,
    DreamParamsRequest
  >,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;
  const dreamUUID: string = req.params.uuid!;
  const fileExtension = req.body.extension!;
  const parts = req.body.parts!;
  const type = req.body.type!;
  const frameNumber = req.body.frameNumber;
  const processed = req.body.processed;

  try {
    // find dream
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    let filePath: string;
    /**
     * dream owner uuid to generate r2 file path
     */
    const userIdentifier = getUserIdentifier(dream.user);

    /**
     * filePath r2 generation
     */
    if (type === DreamFileType.THUMBNAIL) {
      filePath = generateThumbnailPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
      });
    } else if (type === DreamFileType.FILMSTRIP) {
      filePath = generateFilmstripPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        frameNumber: frameNumber!,
      });
    } else if (type === DreamFileType.DREAM) {
      filePath = generateDreamPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        processed,
      });
    }

    const uploadId = await createMultipartUpload(filePath!);
    const arrayUrls = Array.from({ length: parts });
    const urls = await Promise.all(
      arrayUrls.map(
        async (_, index) =>
          await getUploadPartSignedUrl(filePath, uploadId!, index + 1),
      ),
    );
    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { urls, dream: dream, uploadId },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles refresh multipart upload presigned urls to post
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleRefreshMultipartUploadUrl = async (
  req: RequestType<
    RefreshMultipartUploadUrlRequest,
    unknown,
    DreamParamsRequest
  >,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;
  const dreamUUID: string = req.params.uuid!;
  const uploadId = req.body.uploadId!;
  const fileExtension = req.body.extension!;
  const part = req.body.part!;
  const type = req.body.type!;
  const frameNumber = req.body.frameNumber;
  const processed = req.body.processed;

  try {
    // find dream
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    let filePath: string;
    /**
     * dream owner uuid to generate r2 file path
     */
    const userIdentifier = getUserIdentifier(dream.user);

    /**
     * filePath r2 generation
     */
    if (type === DreamFileType.THUMBNAIL) {
      filePath = generateThumbnailPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
      });
    } else if (type === DreamFileType.FILMSTRIP) {
      filePath = generateFilmstripPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        frameNumber: frameNumber!,
      });
    } else if (type === DreamFileType.DREAM) {
      filePath = generateDreamPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        processed,
      });
    }

    const url = await getUploadPartSignedUrl(filePath!, uploadId!, part!);

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { url, dream: dream, uploadId },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles complete multipart upload with presigned urls to post
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCompleteMultipartUpload = async (
  req: RequestType<
    CompleteMultipartUploadDreamRequest,
    unknown,
    DreamParamsRequest
  >,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const dreamUUID: string = req.params.uuid!;
  const uploadId = req.body.uploadId!;
  const fileExtension = req.body.extension!;
  const name = req.body.name
    ? truncateString(req.body.name, 1000, false)
    : dreamUUID;
  const parts = req.body.parts!;
  const type = req.body.type!;
  const frameNumber = req.body.frameNumber;
  /**
   * flag to verify if dream file uploaded is the original or the processed
   */
  const processed = req.body.processed;

  let dream: Dream | undefined;
  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    let filePath: string;
    /**
     * dream owner uuid to generate r2 file path
     */
    const userIdentifier = getUserIdentifier(dream.user);

    /**
     * filePath r2 generation, updates database values if needed
     */
    if (type === DreamFileType.THUMBNAIL) {
      filePath = generateThumbnailPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
      });

      /**
       * updates thumbnail object key on database
       */
      await dreamRepository.update(dream.id, {
        thumbnail: filePath,
      });
    } else if (type === DreamFileType.FILMSTRIP) {
      filePath = generateFilmstripPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        frameNumber: frameNumber!,
      });
    } else if (type === DreamFileType.DREAM && !processed) {
      filePath = generateDreamPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        processed,
      });

      /**
       * Auto-detect mediaType from file extension if not already set
       */
      const detectedMediaType = detectMediaTypeFromExtension(fileExtension);
      const currentMediaType = dream.mediaType ?? detectedMediaType;

      /**
       * if dream file is the original then updates name, original_video object key, mediaType and status
       */
      await dreamRepository.update(dream.id, {
        name,
        original_video: filePath!,
        mediaType: currentMediaType,
        status: DreamStatusType.QUEUE,
      });
    } else if (type === DreamFileType.DREAM && processed) {
      filePath = generateDreamPath({
        userIdentifier,
        dreamUUID,
        extension: fileExtension,
        processed,
      });

      /**
       * if dream file is the processed then updates video object key
       */
      await dreamRepository.update(dream.id, {
        video: filePath!,
      });
    }

    /**
     * completes multipart upload with path, upload id and parts
     */
    await completeMultipartUpload(filePath!, uploadId!, parts!);

    const [updatedDream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      /**
       * originalVideo - needed field on process dream request to video ingestion
       */
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (type === DreamFileType.DREAM && !processed) {
      /**
       * process dream requests: it needs to provide updated dream with originalVideo value
       */
      const processResult = await processDreamRequest(updatedDream);

      /**
       * turn on video service worker only if not prompt-based
       */
      if (!processResult?.isPromptBased) {
        await updateVideoServiceWorker(TURN_ON_QUANTITY);
      }
    }

    tracker.sendEventWithRequestContext(res, user.uuid, "USER_NEW_UPLOAD", {});

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    if (dream) {
      dream.status = DreamStatusType.FAILED;
      await dreamRepository.save(dream);
    }
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles abort multipart upload
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - upload aborted
 * BAD_REQUEST 400 - error aborting upload
 *
 */
export const handleAbortMultipartUpload = async (
  req: RequestType<
    AbortMultipartUploadDreamRequest,
    unknown,
    DreamParamsRequest
  >,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const dreamUUID: string = req.params.uuid!;
  let dream: Dream | undefined;
  try {
    const findDreamResult = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns(),
    });
    dream = findDreamResult[0];

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * dream props
     */
    const extension = req.body.extension;
    const uploadId = req.body.uploadId;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${getUserIdentifier(user)}/${dreamUUID}/${fileName}`;

    await abortMultipartUpload(filePath, uploadId!);

    /**
     * update dream
     */
    dream.status = DreamStatusType.FAILED;
    await dreamRepository.save(dream);
    await dreamRepository.softDelete({ id: dream.id });

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dream vote
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream vote
 * BAD_REQUEST 400 - error getting dream
 *
 */
export const handleGetDreamVote = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = req.params.uuid!;
  try {
    const vote = await voteRepository.findOne({
      where: {
        dream: { uuid: dreamUUID },
        user: { id: user?.id },
      },
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { vote } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream gotten
 * BAD_REQUEST 400 - error getting dream
 *
 */
export const handleGetDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const isBrowser = isBrowserRequest(req as RequestType);
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);
  const dreamUUID: string = req.params.uuid!;
  try {
    const dream = await dreamRepository.findOne({
      where: { uuid: dreamUUID },
      relations: {
        user: true,
        displayedOwner: true,
        startKeyframe: true,
        endKeyframe: true,
      },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
        playlistItems: true,
        startKeyframe: true,
        endKeyframe: true,
      }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    // Get playlist items separately
    dream.playlistItems = await findDreamPlaylistItems(
      dreamUUID,
      user.id,
      isUserAdmin,
    );

    for (const pi of dream.playlistItems ?? []) {
      if (pi.playlist && !pi.playlist.thumbnail) {
        const fallbackThumb = await computePlaylistThumbnailRecursive(
          pi.playlist.id,
          {
            userId: user.id,
            isAdmin: isUserAdmin,
            nsfw: user?.nsfw,
            onlyProcessedDreams: true,
          },
        );
        if (fallbackThumb) {
          pi.playlist.thumbnail = fallbackThumb;
        }
      }
    }

    const isOwner = dream.user.id === user?.id;

    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    // If is hidden and is not allowed to view return not found
    if (dream.hidden && !isAllowed) {
      return handleNotFound(req as RequestType, res);
    }

    let reports: Report[] = [];

    if (isUserAdmin || isOwner) {
      // Find unprocessed reports
      reports = await reportRepository.find({
        where: { dream: { uuid: dream.uuid }, processed: false },
      });
    }

    dream.reports = reports;

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

    const transformedDream = await transformDreamWithSignedUrls(dream);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: transformedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get my dreams
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams gotten
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetMyDreams = async (
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const user = res.locals.user;

  try {
    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { id: user?.id } },
      relations: { user: true },
      select: getDreamSelectedColumns(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const transformedDreams = await transformDreamsWithSignedUrls(dreams);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { dreams: transformedDreams, count },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles process dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream processed
 * BAD_REQUEST 400 - error processing dream
 *
 */
export const handleProcessDream = async (
  req: RequestType<UpdateDreamRequest, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const processResult = await processDreamRequest(dream);

    if (!processResult?.isPromptBased) {
      await updateVideoServiceWorker(TURN_ON_QUANTITY);
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.QUEUE,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles set dream status processing
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream status changed
 * BAD_REQUEST 400 - error updating dream
 *
 */
export const handleSetDreamStatusProcessing = async (
  req: RequestType<UpdateDreamRequest, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.PROCESSING,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles set dream status processing
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream status changed
 * BAD_REQUEST 400 - error updating dream
 *
 */
export const handleSetDreamStatusProcessed = async (
  req: RequestType<UpdateDreamProcessedRequest, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);
  const dreamUUID: string = req.params.uuid!;
  const processedVideoSize = req.body.processedVideoSize;
  const processedVideoFrames = req.body.processedVideoFrames!;
  const processedVideoFPS = req.body.processedVideoFPS;
  const processedMediaWidth = req.body.processedMediaWidth;
  const processedMediaHeight = req.body.processedMediaHeight;
  const render_duration = req.body.render_duration;
  const activityLevel = req.body.activityLevel!;
  const filmstrip = req.body.filmstrip
    ? (req.body.filmstrip as number[])
    : undefined;
  const md5 = req.body.md5;
  const mediaType = req.body.mediaType;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    /**
     * Save processed dream data
     */

    const user = dream.user;
    const formatedFilmstrip: Frame[] | undefined = filmstrip?.map(
      (frame) =>
        ({
          frameNumber: Number(frame),
          url: `${getUserIdentifier(
            user,
          )}/${dreamUUID}/filmstrip/frame-${frame}.${FILE_EXTENSIONS.JPG}`,
        }) as Frame,
    );

    const updateData: Partial<Dream> = {
      status: DreamStatusType.PROCESSED,
      processed_at: new Date(),
      processedVideoSize,
      processedVideoFrames,
      processedVideoFPS,
      processedMediaWidth,
      processedMediaHeight,
      render_duration,
      activityLevel,
      md5,
    };

    if (mediaType === DreamMediaType.IMAGE) {
      updateData.filmstrip = null as unknown as Frame[];
    } else if (formatedFilmstrip) {
      updateData.filmstrip = formatedFilmstrip;
    }

    if (mediaType) {
      updateData.mediaType = mediaType;
    }

    await dreamRepository.update(dream.id, updateData);

    const [updatedDream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    // Get playlist items separately
    updatedDream.playlistItems = await findDreamPlaylistItems(
      dreamUUID,
      user.id,
      isUserAdmin,
    );

    for (const pi of updatedDream.playlistItems ?? []) {
      if (pi.playlist && !pi.playlist.thumbnail) {
        const fallbackThumb = await computePlaylistThumbnailRecursive(
          pi.playlist.id,
          {
            userId: user.id,
            isAdmin: isUserAdmin,
            nsfw: user?.nsfw,
            onlyProcessedDreams: true,
          },
        );
        if (fallbackThumb) {
          pi.playlist.thumbnail = fallbackThumb;
        }
      }
    }

    await createFeedItem(updatedDream);
    await refreshPlaylistUpdatedAtTimestampFromPlaylistItems(
      updatedDream.playlistItems?.map((pi) => pi.id),
    );

    /**
     * get jobs queue on video service
     */
    const jobs = await getQueueValues(DEFAULT_QUEUE);

    /**
     * if there are not jobs on queue, turn off video service workers
     */
    if (!jobs.length) {
      await updateVideoServiceWorker(TURN_OFF_QUANTITY);
    }

    tracker.sendEventWithRequestContext(res, user.uuid, "DREAM_UPLOADED", {
      size_bytes: processedVideoSize,
      duration_seconds: framesToSeconds(processedVideoFrames, activityLevel),
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles set dream status processing
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream status changed
 * BAD_REQUEST 400 - error updating dream
 *
 */
export const handleSetDreamStatusFailed = async (
  req: RequestType<SetDreamStatusFailedRequest, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const error = req.body?.error;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.FAILED,
      error: error || null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles update dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream updated
 * BAD_REQUEST 400 - error updating dream
 *
 */
export const handleUpdateDream = async (
  req: RequestType<UpdateDreamRequest, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;
  const isUserAdmin = isAdmin(user);

  try {
    const dream = await dreamRepository.findOne({
      where: { uuid: dreamUUID },
      relations: {
        user: true,
        displayedOwner: true,
        startKeyframe: true,
        endKeyframe: true,
      },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
        playlistItems: true,
        startKeyframe: true,
        endKeyframe: true,
      }),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    // Get playlist items separately
    dream.playlistItems = await findDreamPlaylistItems(
      dreamUUID,
      user.id,
      isUserAdmin,
    );

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /*
     * Check if the user is an admin
     * remove fields from the updateData object if is not an admin
     */
    if (!isAdmin(user)) {
      delete dream.featureRank;
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      displayedOwner: _displayedOwner,
      user: _user,
      startKeyframe: _startKeyframe,
      endKeyframe: _endKeyframe,
      ...sanitizedDreamData
    } = req.body;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Dream> = sanitizedDreamData as Omit<
      UpdateDreamRequest,
      "displayedOwner" | "user" | "startKeyframe" | "endKeyframe"
    >;

    let displayedOwner: User | null = null;
    let newOwner: User | null = null;
    let startKeyframe: Keyframe | null,
      endKeyframe: Keyframe | null = null;

    if (isAdmin(user) && req.body.displayedOwner) {
      displayedOwner = await userRepository.findOneBy({
        id: req.body.displayedOwner,
      });
    }

    // Update actual owner (user field) - admin only
    if (isAdmin(user) && req.body.user) {
      newOwner = await userRepository.findOne({
        where: { uuid: req.body.user },
      });

      if (!newOwner) {
        return handleNotFound(req as RequestType, res, {
          message: "User not found",
        });
      }

      updateData = { ...updateData, user: newOwner };
      /**
       * update feed item user too
       */
      await feedItemRepository.update(
        { dreamItem: { id: dream.id } },
        { user: newOwner },
      );
    }

    // find start keyframe, if exists save it into the dream
    if (req.body.startKeyframe) {
      startKeyframe = await keyframeRepository.findOne({
        where: {
          uuid: req.body.startKeyframe,
        },
      });

      if (!startKeyframe) {
        return handleNotFound(req as RequestType, res, {
          message: DREAM_MESSAGES.START_KEYFRAME_NOT_FOUND,
        });
      }
      updateData = { ...updateData, startKeyframe };
    }

    // find end keyframe, if exists save it into the dream
    if (req.body.endKeyframe) {
      endKeyframe = await keyframeRepository.findOne({
        where: {
          uuid: req.body.endKeyframe,
        },
      });

      if (!endKeyframe) {
        return handleNotFound(req as RequestType, res, {
          message: DREAM_MESSAGES.END_KEYFRAME_NOT_FOUND,
        });
      }
      updateData = { ...updateData, endKeyframe };
    }

    /**
     * update displayed owner for dream and feed item
     */
    if (displayedOwner) {
      updateData = { ...updateData, displayedOwner: displayedOwner };
      /**
       * update feed item user too
       */
      await feedItemRepository.update(
        { dreamItem: { id: dream.id } },
        { user: displayedOwner },
      );
    }

    await dreamRepository.update(dream.id, {
      ...updateData,
    });

    const [updatedDream] = await dreamRepository.find({
      where: { uuid: dreamUUID },
      relations: {
        user: true,
        displayedOwner: true,
        startKeyframe: true,
        endKeyframe: true,
      },
      select: getDreamSelectedColumns({
        originalVideo: true,
        featureRank: true,
        playlistItems: true,
        startKeyframe: true,
        endKeyframe: true,
      }),
    });

    if (!updatedDream) {
      return handleNotFound(req as RequestType, res);
    }

    updatedDream.playlistItems = await findDreamPlaylistItems(
      dreamUUID,
      user.id,
      isUserAdmin,
    );

    if (!isAdmin(user)) {
      delete updatedDream.featureRank;
    }

    const transformedDream = await transformDreamWithSignedUrls(updatedDream);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: transformedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles update thumbnail dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - thumbnail dream updated
 * BAD_REQUEST 400 - error updating thumbnail dream
 *
 */
export const handleUpdateThumbnailDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const dreamUUID: string = req.params.uuid!;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // update dream
    const thumbnailBuffer = req.file?.buffer;
    const bucketName = env.R2_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension = MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.MP4];
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${getUserIdentifier(user)}/${dreamUUID}/${fileName}`;

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

    const updatedDream = await dreamRepository.save({
      ...dream,
      thumbnail: thumbnailBuffer ? filePath : null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles upvote dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream upvoted
 * BAD_REQUEST 400 - error upvoting dream
 *
 */
export const handleUpvoteDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const dream = await dreamRepository.findOne({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    await handleVoteDream({ dream, user, voteType: VoteType.UPVOTE });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles downvote dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream downvoted
 * BAD_REQUEST 400 - error downvoting dream
 *
 */
export const handleDownvoteDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const dream = await dreamRepository.findOne({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    await handleVoteDream({ dream, user, voteType: VoteType.DOWNVOTE });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles unvote dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream unvoted
 * BAD_REQUEST 400 - error unvoting dream
 *
 */
export const handleUnvoteDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    await handleVoteDream({ dream, user, voteType: VoteType.NONE });

    const [updatedDream] = await dreamRepository.find({
      where: { id: dream.id },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles delete dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * NO_CONTENT 204 - dream
 * BAD_REQUEST 400 - error deleting dream
 *
 */
export const handleDeleteDream = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user;
  try {
    const dream = await dreamRepository.findOne({
      where: { uuid },
      relations: {
        user: true,
        /**
         * Adding `playlistItems`, `feedItem` and `votes` helps to soft remove relations
         */
        playlistItems: true,
        feedItem: true,
        votes: true,
      },
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const affected = await dreamRepository.softRemove(dream);

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
 * Handles cancel dream job
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - job cancelled
 * NOT_FOUND 404 - dream not found
 * FORBIDDEN 403 - user not authorized
 * INTERNAL_SERVER_ERROR 500 - error cancelling job
 *
 */
export const handleCancelDreamJob = async (
  req: RequestType<unknown, unknown, DreamParamsRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: {
        id: true,
        uuid: true,
        status: true,
        user: {
          id: true,
          uuid: true,
        },
      },
    });

    if (!dream) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // Import the cancel utility
    const { cancelJobAcrossQueues } = await import("utils/job-cancel.util");

    // Cancel the job across all queues
    const result = await cancelJobAcrossQueues(dreamUUID, true);

    APP_LOGGER.info(
      `Cancel job request for dream ${dreamUUID}: ${result.message}`,
    );

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          message: result.message,
          jobFound: result.jobFound,
          runpodCancelled: result.runpodCancelled,
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    APP_LOGGER.error(
      `Error cancelling job for dream ${dreamUUID}:`,
      error.message || error,
    );
    return handleInternalServerError(error, req as RequestType, res);
  }
};
