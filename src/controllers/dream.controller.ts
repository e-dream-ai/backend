import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
import {
  FILE_EXTENSIONS,
  MYME_TYPES,
  MYME_TYPES_EXTENSIONS,
} from "constants/file.constants";
import { DREAM_MESSAGES } from "constants/messages/dream.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Dream, FeedItem, Vote } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import {
  CompleteMultipartUploadDreamRequest,
  ConfirmDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreatePresignedDreamRequest,
  DreamStatusType,
  UpdateDreamRequest,
} from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { FeedItemType } from "types/feed-item.types";
import { VOTE_FIELDS, VoteType } from "types/vote.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { getDreamSelectedColumns, processDreamRequest } from "utils/dream.util";
import { canExecuteAction } from "utils/permissions.util";
import { isBrowserRequest } from "utils/request.util";
import { jsonResponse } from "utils/responses.util";
import {
  completeMultipartUpload,
  createMultipartUpload,
  generatePresignedPost,
  getSignedUrlForPost,
} from "utils/s3.util";

const dreamRepository = appDataSource.getRepository(Dream);

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
export const handleGetDreams = async (req: RequestType, res: ResponseType) => {
  try {
    const isBrowser = isBrowserRequest(req);
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;
    const userId = Number(req.query.userId) || undefined;

    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { id: userId } },
      relations: { user: true },
      select: getDreamSelectedColumns({ originalVideo: isBrowser }),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dreams: dreams, count } }));
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
 * Handles create dream signed URL
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCreateDreamSignedURL = async (
  req: RequestType,
  res: ResponseType,
) => {
  // setting vars
  try {
    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: {} }));
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
    const name = req.body.name;
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
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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

    /**
     * update dream
     */

    const extension = req.body.extension;
    const name = req.body.name || dreamUUID;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    dream.original_video = generateBucketObjectURL(filePath);
    dream.name = name;
    dream.status = DreamStatusType.QUEUE;
    const createdDream = await dreamRepository.save(dream);

    /**
     * process dream
     */
    await processDreamRequest(dream);

    /**
     * create feed item when dream is created
     */
    const feedRepository = appDataSource.getRepository(FeedItem);

    const feedItem = new FeedItem();
    feedItem.type = FeedItemType.DREAM;
    feedItem.user = createdDream.user;
    feedItem.dreamItem = createdDream;
    feedItem.created_at = createdDream.created_at;
    feedItem.updated_at = createdDream.updated_at;

    await feedRepository.save(feedItem);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (error) {
    APP_LOGGER.error(error);
    if (dream) {
      dream.status = DreamStatusType.FAILED;
      await dreamRepository.save(dream);
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  let dream: Dream | undefined;

  try {
    // create dream
    const name = req.body.name;
    const extension = req.body.extension;
    const parts = req.body.parts ?? 1;
    dream = new Dream();
    dream.name = name;
    dream.user = user!;
    await dreamRepository.save(dream);
    const dreamUUID = dream.uuid;
    const fileExtension = extension;
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;
    const uploadId = await createMultipartUpload(filePath);
    const arrayUrls = Array.from({ length: parts });
    const urls = await Promise.all(
      arrayUrls.map(
        async (_, index) =>
          await getSignedUrlForPost(filePath, uploadId!, index + 1),
      ),
    );
    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { urls, uuid: dreamUUID, uploadId },
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
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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

    /**
     * dream props
     */

    const extension = req.body.extension;
    const name = req.body.name || dreamUUID;
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
     * process dream
     */
    await processDreamRequest(dream);

    /**
     * create feed item when dream is created
     */
    const feedRepository = appDataSource.getRepository(FeedItem);

    const feedItem = new FeedItem();
    feedItem.type = FeedItemType.DREAM;
    feedItem.user = createdDream.user;
    feedItem.dreamItem = createdDream;
    feedItem.created_at = createdDream.created_at;
    feedItem.updated_at = createdDream.updated_at;

    await feedRepository.save(feedItem);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (error) {
    APP_LOGGER.error(error);
    if (dream) {
      dream.status = DreamStatusType.FAILED;
      await dreamRepository.save(dream);
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
  }
};

/**
 * Handles create dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dream created
 * BAD_REQUEST 400 - error creating dream
 *
 */
export const handleCreateDream = async (
  req: RequestType,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;
  const videoBuffer = req.file?.buffer;
  const bucketName = env.AWS_BUCKET_NAME;
  let dream: Dream | undefined;

  try {
    // create dream
    dream = new Dream();
    dream.user = user!;
    await dreamRepository.save(dream);
    const dreamUUID = dream.uuid;

    const fileMymeType = req.file?.mimetype;
    const fileExtension = MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.MP4];
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: videoBuffer,
      ACL: BUCKET_ACL,
    });

    await s3Client.send(command);

    /**
     * process dream
     */
    await processDreamRequest(dream);

    /**
     * update dream
     */
    dream.original_video = generateBucketObjectURL(filePath);
    dream.status = DreamStatusType.QUEUE;
    const createdDream = await dreamRepository.save(dream);

    /**
     * create feed item when dream is created
     */
    const feedRepository = appDataSource.getRepository(FeedItem);

    const feedItem = new FeedItem();
    feedItem.type = FeedItemType.DREAM;
    feedItem.user = createdDream.user;
    feedItem.dreamItem = createdDream;
    feedItem.created_at = createdDream.created_at;
    feedItem.updated_at = createdDream.updated_at;

    await feedRepository.save(feedItem);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (error) {
    APP_LOGGER.error(error);
    if (dream) await dreamRepository.softRemove(dream);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
    );
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const isBrowser = isBrowserRequest(req);
  const user = res.locals.user;
  const dreamUUID: string = String(req.params?.uuid);
  try {
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true, playlistItems: true },
      select: getDreamSelectedColumns({ originalVideo: true }),
    });

    if (!dream) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
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

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: dream } }));
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
    PAGINATION.TAKE,
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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.PROCESSING,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
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
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    const updatedDream = await dreamRepository.save({
      ...dream,
      status: DreamStatusType.FAILED,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
      relations: { user: true },
      select: getDreamSelectedColumns(),
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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

    const updatedDream = await dreamRepository.save({ ...dream, ...req.body });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
 * Handles update video dream
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - video dream updated
 * BAD_REQUEST 400 - error updating video dream
 *
 */
export const handleUpdateVideoDream = async (
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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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

    // update dream
    const videoBuffer = req.file?.buffer;
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension = MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.MP4];
    const fileName = `${dreamUUID}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    if (videoBuffer) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        Body: videoBuffer,
        ACL: BUCKET_ACL,
      });
      await s3Client.send(command);
    }

    const updatedDream: Dream = await dreamRepository.save({
      ...dream,
      original_video: videoBuffer ? generateBucketObjectURL(filePath) : null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user;
  let shouldDecreaseDownvotes = false,
    shouldIncreaseUpvotes = true;

  try {
    const voteRepository = appDataSource.getRepository(Vote);

    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    let [vote] = await voteRepository.find({
      where: { dream: { id: dream.id }, user: { id: user?.id } },
    });

    if (vote) {
      shouldDecreaseDownvotes = vote.vote === VoteType.DOWNVOTE ? true : false;
      shouldIncreaseUpvotes = vote.vote === VoteType.UPVOTE ? false : true;
    } else {
      vote = new Vote();
      vote.dream = dream;
      vote.user = user!;
    }

    vote.vote = VoteType.UPVOTE;
    // save vote
    voteRepository.save(vote);

    // increment upvotes
    if (shouldIncreaseUpvotes) {
      await dreamRepository
        .createQueryBuilder()
        .update(Dream)
        .whereInIds([dream.id])
        .set({ upvotes: () => `${VOTE_FIELDS.UPVOTES} + 1` })
        .execute();
    }

    // decrement downvotes if needed
    if (shouldDecreaseDownvotes) {
      await dreamRepository
        .createQueryBuilder()
        .update(Dream)
        .whereInIds([dream.id])
        .set({ downvotes: () => `${VOTE_FIELDS.DOWNVOTES} - 1` })
        .execute();
    }

    const [updatedDream] = await dreamRepository.find({
      where: { uuid: dreamUUID!, votes: { user: { id: user?.id } } },
      relations: { user: true, votes: true },
      select: getDreamSelectedColumns(),
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamUUID: string = String(req.params.uuid);
  const user = res.locals.user;
  let shouldIncreaseDownvotes = true,
    shouldDecreaseUpvotes = false;

  try {
    const voteRepository = appDataSource.getRepository(Vote);

    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    let [vote] = await voteRepository.find({
      where: { dream: { id: dream.id }, user: { id: user?.id } },
    });

    if (vote) {
      shouldIncreaseDownvotes = vote.vote === VoteType.DOWNVOTE ? false : true;
      shouldDecreaseUpvotes = vote.vote === VoteType.UPVOTE ? true : false;
    } else {
      vote = new Vote();
      vote.dream = dream;
      vote.user = user!;
    }

    vote.vote = VoteType.DOWNVOTE;
    // save vote
    voteRepository.save(vote);

    // increment downvotes
    if (shouldIncreaseDownvotes) {
      await dreamRepository
        .createQueryBuilder()
        .update(Dream)
        .whereInIds([dream.id])
        .set({ downvotes: () => `${VOTE_FIELDS.DOWNVOTES} + 1` })
        .execute();
    }

    // decrement upvotes if needed
    if (shouldDecreaseUpvotes) {
      await dreamRepository
        .createQueryBuilder()
        .update(Dream)
        .whereInIds([dream.id])
        .set({ upvotes: () => `${VOTE_FIELDS.UPVOTES} - 1` })
        .execute();
    }

    const [updatedDream] = await dreamRepository.find({
      where: { uuid: dreamUUID!, votes: { user: { id: user?.id } } },
      relations: { user: true, votes: true },
      select: getDreamSelectedColumns(),
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    const isAllowed = canExecuteAction({
      isOwner: dream.user.id === user?.id,
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

    const affected = await dreamRepository.softRemove(dream);

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
