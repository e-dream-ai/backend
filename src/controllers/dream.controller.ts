import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import {
  DREAMS_FILE_EXTENSIONS,
  DREAMS_MEDIA_TYPES,
} from "constants/dreams.constants";
import { DREAM_MESSAGES } from "constants/messages/dream.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { UpdateDreamRequest } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { completeMediaUrl } from "utils/aws/bucket.util";
import { jsonResponse } from "utils/responses.util";

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
      ContentType: DREAMS_MEDIA_TYPES.MP4,
    });

    await s3Client.send(command);

    //update dream
    dream.video = filePath;
    const createdDream = await dreamRepository.save(dream);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { dream: createdDream } }));
  } catch (err) {
    console.error(err);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(jsonResponse({ success: false }));
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
  const dreamRepository = appDataSource.getRepository(Dream);
  const dream = await dreamRepository.findOneBy({ uuid: dreamUUID! });

  if (!dream) {
    res
      .status(httpStatus.NOT_FOUND)
      .json(
        jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
      );
  }

  if (dream?.video) {
    dream.video = completeMediaUrl(dream.video);
  }

  return res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { dream: dream } }));
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
  const dreamRepository = appDataSource.getRepository(Dream);
  const dream = await dreamRepository.findOneBy({ uuid: dreamUUID });

  if (!dream) {
    return res.status(httpStatus.NOT_FOUND).json(
      jsonResponse({
        success: false,
        message: DREAM_MESSAGES.DREAM_NOT_FOUND,
      }),
    );
  }

  const updatedDream = await dreamRepository.save({ ...dream, ...req.body });

  if (updatedDream?.video) {
    updatedDream.video = completeMediaUrl(dream.video);
  }

  res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
  const dreamId: number = Number(req.params.id);
  const dreamRepository = appDataSource.getRepository(Dream);
  const dream = await dreamRepository.findOneBy({ id: dreamId! });

  if (!dream) {
    return res.status(httpStatus.NOT_FOUND).json(
      jsonResponse({
        success: false,
        message: DREAM_MESSAGES.DREAM_NOT_FOUND,
      }),
    );
  }

  // update dream
  const videoBuffer = req.file?.buffer;
  const dreamUUID = dream.uuid;
  const bucketName = env.AWS_BUCKET_NAME;
  const fileName = `${dreamUUID}.${DREAMS_FILE_EXTENSIONS.MP4}`;
  const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: videoBuffer,
    ContentType: DREAMS_MEDIA_TYPES.MP4,
  });

  const updatedDream = await dreamRepository.save({
    ...dream,
    video: filePath,
  });

  await s3Client.send(command);

  res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
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
export const handleThumbnailDream = async (
  req: RequestType,
  res: ResponseType,
) => {
  const user = res.locals.user;
  const dreamId: number = Number(req.params.id);
  const dreamRepository = appDataSource.getRepository(Dream);
  const dream = await dreamRepository.findOneBy({ id: dreamId! });

  if (!dream) {
    return res.status(httpStatus.NOT_FOUND).json(
      jsonResponse({
        success: false,
        message: DREAM_MESSAGES.DREAM_NOT_FOUND,
      }),
    );
  }

  // update dream
  const thumbnailBuffer = req.file?.buffer;
  const dreamUUID = dream.uuid;
  const bucketName = env.AWS_BUCKET_NAME;
  const fileName = `${dreamUUID}.${DREAMS_FILE_EXTENSIONS.JPG}`;
  const filePath = `${user?.cognitoId}/${dreamUUID}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: thumbnailBuffer,
    ContentType: DREAMS_MEDIA_TYPES.JPEG,
  });

  const updatedDream = await dreamRepository.save({
    ...dream,
    thumbnail: filePath,
  });

  await s3Client.send(command);

  res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
};
