import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
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
import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Dream, FeedItem, User, Vote } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import {
  AbortMultipartUploadDreamRequest,
  CompleteMultipartUploadDreamRequest,
  ConfirmDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreatePresignedDreamRequest,
  DreamStatusType,
  GetDreamQuery,
  GetDreamsQuery,
  RefreshMultipartUploadUrlRequest,
  UpdateDreamProcessedRequest,
  UpdateDreamRequest,
} from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { VoteType } from "types/vote.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import {
  createFeedItem,
  getDreamSelectedColumns,
  handleVoteDream,
  processDreamRequest,
} from "utils/dream.util";
import { getQueueValues, updateVideoServiceWorker } from "utils/job.util";
import { canExecuteAction } from "utils/permissions.util";
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
  generatePresignedPost,
  getUploadPartSignedUrl,
} from "utils/s3.util";
import { truncateString } from "utils/string.util";
import { isAdmin } from "utils/user.util";

/**
 * Repositories
 */
const dreamRepository = appDataSource.getRepository(Dream);
const userRepository = appDataSource.getRepository(User);
const feedItemRepository = appDataSource.getRepository(FeedItem);
const voteRepository = appDataSource.getRepository(Vote);

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
    const userId = Number(req.query.userId) || undefined;

    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { id: userId }, status },
      relations: { user: true, displayedOwner: true },
      select: getDreamSelectedColumns({ originalVideo: isBrowser }),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dreams: dreams, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create dream presigned post
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCreatePresignedPost = async (
  req: RequestType<CreatePresignedDreamRequest>,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;
  let dream: Dream | undefined;

  try {
    // create dream
    const name = req.body.name
      ? truncateString(req.body.name, 1000, false)
      : undefined;
    const extension = req.body.extension;
    dream = new Dream();
    dream.name = name;
    dream.user = user!;
    await dreamRepository.save(dream);
    const dreamUUID = dream.uuid;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;
    const { url, fields } = await generatePresignedPost(filePath);
    return res
      .status(httpStatus.CREATED)
      .json(
        jsonResponse({ success: true, data: { url, fields, uuid: dreamUUID } }),
      );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles confirm dream presigned URL
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleConfirmPresignedPost = async (
  req: RequestType<ConfirmDreamRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = String(req.params?.uuid);
  let dream: Dream | undefined;
  try {
    const findDreamResult = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns(),
    });
    dream = findDreamResult[0];

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    /**
     * update dream
     */

    const extension = req.body.extension;
    const name = req.body.name
      ? truncateString(req.body.name, 1000, false)
      : dreamUUID;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    dream.original_video = generateBucketObjectURL(filePath);
    dream.name = name;
    dream.status = DreamStatusType.QUEUE;
    const createdDream = await dreamRepository.save(dream);

    /**
     * turn on video service worker
     */
    await updateVideoServiceWorker(TURN_ON_QUANTITY);

    /**
     * process dream
     */
    await processDreamRequest(dream);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (err) {
    if (dream) {
      dream.status = DreamStatusType.FAILED;
      await dreamRepository.save(dream);
    }
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  const user = res.locals.user;
  let dream: Dream;

  try {
    const dreamUUID = req.body.uuid;
    // truncate string to 1000 characters
    const name = truncateString(req.body.name, 1000, false);
    const extension = req.body.extension;
    const parts = req.body.parts ?? 1;
    const nsfw = req.body.nsfw;

    if (!dreamUUID) {
      // create dream
      dream = new Dream();
      dream.name = name;
      dream.user = user!;
      dream.nsfw = nsfw ?? false;
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
      return handleNotFound(req, res);
    }

    const uuid = dream.uuid;
    const fileExtension = extension;
    const fileName = `${uuid}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${uuid}/${fileName}`;
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
    return handleInternalServerError(error, req, res);
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
  req: RequestType<RefreshMultipartUploadUrlRequest>,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;

  try {
    const dreamUUID: string = String(req.params?.uuid);
    const uploadId = req.body.uploadId;
    const extension = req.body.extension;
    const part = req.body.part;

    // find dream
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    const uuid = dream.uuid;
    const fileExtension = extension;
    const fileName = `${uuid}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${uuid}/${fileName}`;

    const url = await getUploadPartSignedUrl(filePath, uploadId!, part!);

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { url, dream: dream, uploadId },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
export const handleCompleteMultipartUpload = async (
  req: RequestType<CompleteMultipartUploadDreamRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = String(req.params?.uuid);
  let dream: Dream | undefined;
  try {
    const findDreamResult = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns(),
    });
    dream = findDreamResult[0];

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    /**
     * dream props
     */

    const extension = req.body.extension;
    const name = req.body.name
      ? truncateString(req.body.name, 1000, false)
      : dreamUUID;
    const uploadId = req.body.uploadId;
    const parts = req.body.parts;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    await completeMultipartUpload(filePath, uploadId!, parts!);

    /**
     * update dream
     */
    dream.original_video = generateBucketObjectURL(filePath);
    dream.name = name;
    dream.status = DreamStatusType.QUEUE;
    const createdDream = await dreamRepository.save(dream);

    /**
     * turn on video service worker
     */
    await updateVideoServiceWorker(TURN_ON_QUANTITY);

    /**
     * process dream
     */
    await processDreamRequest(dream);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (err) {
    if (dream) {
      dream.status = DreamStatusType.FAILED;
      await dreamRepository.save(dream);
    }
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<AbortMultipartUploadDreamRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = String(req.params?.uuid);
  let dream: Dream | undefined;
  try {
    const findDreamResult = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns(),
    });
    dream = findDreamResult[0];

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    /**
     * dream props
     */
    const extension = req.body.extension;
    const uploadId = req.body.uploadId;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

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
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
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

    const vote = await voteRepository.findOne({
      where: {
        dream: { id: dream.id },
        user: { id: user?.id },
      },
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { vote } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<GetDreamQuery>,
  res: ResponseType,
) => {
  const isBrowser = isBrowserRequest(req);
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

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: dream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dreams, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      /**
       * originalVideo needed to process dream
       */
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    /**
     * turn on video service worker
     */
    await updateVideoServiceWorker(TURN_ON_QUANTITY);

    /**
     * process dream
     */
    await processDreamRequest(dream);

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.QUEUE,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req, res);
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
    return handleInternalServerError(error, req, res);
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
  req: RequestType<UpdateDreamProcessedRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const processedVideoSize = req.body.processedVideoSize;
  const processedVideoFrames = req.body.processedVideoFrames;
  const processedVideoFPS = req.body.processedVideoFPS;
  const activityLevel = req.body.activityLevel;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    /**
     * Save processed dream data
     */

    const user = dream.user;
    const processedSufix = "_processed";
    const videoFileName = `${dreamUUID}${processedSufix}.${FILE_EXTENSIONS.MP4}`;
    const videoFilePath = `${user?.cognitoId}/${dreamUUID}/${videoFileName}`;
    const thumbnailFileName = `${dreamUUID}.${FILE_EXTENSIONS.PNG}`;
    const thumbnailFilePath = `${user?.cognitoId}/${dreamUUID}/thumbnails/${thumbnailFileName}`;

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.PROCESSED,
      video: generateBucketObjectURL(videoFilePath),
      thumbnail: generateBucketObjectURL(thumbnailFilePath),
      processed_at: new Date(),
      processedVideoSize,
      processedVideoFrames,
      processedVideoFPS,
      activityLevel,
    });

    await createFeedItem(updatedDream);

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

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.FAILED,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, displayedOwner: true },
      select: getDreamSelectedColumns({ featureRank: true }),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    /*
     * Check if the user is an admin
     * remove fields from the updateData object if is not an admin
     */
    if (!isAdmin(user)) {
      delete dream.featureRank;
    }

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Dream> = {
      ...(req.body as Omit<UpdateDreamRequest, "displayedOwner">),
    };

    let displayedOwner: User | null = null;
    if (isAdmin(user) && req.body.displayedOwner) {
      displayedOwner = await userRepository.findOneBy({
        id: req.body.displayedOwner,
      });
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

    const updatedDream = await dreamRepository.findOne({
      where: { id: dream.id },
      relations: {
        user: true,
        displayedOwner: true,
      },
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamUUID: string = String(req.params.uuid);

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    // update dream
    const thumbnailBuffer = req.file?.buffer;
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension = MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.MP4];
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

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

    const updatedDream = await dreamRepository.save({
      ...dream,
      thumbnail: thumbnailBuffer ? generateBucketObjectURL(filePath) : null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user!;

  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    await handleVoteDream({ dream, user, voteType: VoteType.UPVOTE });

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
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user!;
  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    await handleVoteDream({ dream, user, voteType: VoteType.DOWNVOTE });

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
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user!;
  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return handleNotFound(req, res);
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
    return handleInternalServerError(error, req, res);
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
  req: RequestType,
  res: ResponseType,
) => {
  const uuid: string = String(req.params?.uuid) || "";
  const user = res.locals.user;
  try {
    const dream = await dreamRepository.findOne({
      where: { uuid },
      relations: {
        user: true,
        playlistItems: true,
        feedItem: true,
      },
    });

    if (!dream) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    const affected = await dreamRepository.softRemove(dream);

    if (!affected) {
      return handleNotFound(req, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};
