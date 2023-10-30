import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
import { DREAMS_FILE_EXTENSIONS } from "constants/dreams.constants";
import { DREAM_MESSAGES } from "constants/messages/dream.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { PAGINATION } from "constants/pagination.constants";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { UpdateDreamRequest } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { jsonResponse } from "utils/responses.util";

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
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;
    const userId = Number(req.query.userId) || undefined;
    const dreamRepository = appDataSource.getRepository(Dream);

    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { id: userId } },
      relations: { user: true },
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

  try {
    const dreamRepository = appDataSource.getRepository(Dream);

    // create dream
    const dream = new Dream();
    dream.user = user!;
    await dreamRepository.save(dream);
    const dreamUUID = dream.uuid;

    const fileName = `${dreamUUID}.${DREAMS_FILE_EXTENSIONS.MP4}`;
    const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      Body: videoBuffer,
      ACL: BUCKET_ACL,
    });

    await s3Client.send(command);

    //update dream
    dream.video = generateBucketObjectURL(filePath);
    const createdDream = await dreamRepository.save(dream);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
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
  const dreamUUID: string = String(req.params?.uuid);
  try {
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID! },
      relations: { user: true },
    });

    if (!dream) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
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
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dreams, count] = await dreamRepository.findAndCount({
      where: { user: { id: user?.id } },
      relations: { user: true },
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
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID },
      relations: { user: true },
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    if (dream.user.id !== user?.id) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
    }

    const updatedDream = await dreamRepository.save({ ...dream, ...req.body });

    res
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
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID },
      relations: { user: true },
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    if (dream.user.id !== user?.id) {
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
    const fileName = `${dreamUUID}.${DREAMS_FILE_EXTENSIONS.MP4}`;
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
      video: videoBuffer ? generateBucketObjectURL(filePath) : null,
    });

    res
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
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dream] = await dreamRepository.find({
      where: { uuid: dreamUUID },
      relations: { user: true },
    });

    if (!dream) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: DREAM_MESSAGES.DREAM_NOT_FOUND,
        }),
      );
    }

    if (dream.user.id !== user?.id) {
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
    const fileName = `${dreamUUID}.${DREAMS_FILE_EXTENSIONS.JPG}`;
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

    res
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
    const dreamRepository = appDataSource.getRepository(Dream);
    const [dream] = await dreamRepository.find({
      where: { uuid },
      relations: { user: true },
    });

    if (!dream) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
        );
    }

    if (dream.user.id !== user?.id) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.UNAUTHORIZED,
        }),
      );
    }

    const { affected } = await dreamRepository.softDelete({
      id: dream.id,
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
