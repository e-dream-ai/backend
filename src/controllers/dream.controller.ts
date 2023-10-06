import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import {
  DREAMS_FILE_EXTENSIONS,
  DREAMS_MEDIA_TYPES,
} from "constants/dreams.constants";
import appDataSource from "database/app-data-source";
import { Dream, User } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { CreateDreamRequest, UpdateDreamRequest } from "types/dream.types";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import { v4 as uuidv4 } from "uuid";

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
  req: RequestType<CreateDreamRequest>,
  res: ResponseType,
) => {
  // setting vars
  const userCognitoId = res.locals.user?.id;
  const userRepository = appDataSource.getRepository(User);
  const user = await userRepository.findOneBy({ cognitoId: userCognitoId });
  const videoBuffer = req.file?.buffer;
  const bucketName = env.AWS_BUCKET_NAME;
  const fileName = `${uuidv4()}.${DREAMS_FILE_EXTENSIONS.MP4}`;

  try {
    const dreamRepository = appDataSource.getRepository(Dream);

    // create dream
    const dream = new Dream();
    dream.user = user!;
    await dreamRepository.save(dream);

    const dreamUUID = dream.uuid;
    const filePath = `${userCognitoId}/${dreamUUID}/${fileName}`;

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
      .json(jsonResponse({ success: true, data: createdDream }));
  } catch (err) {
    console.error(err);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(jsonResponse({ success: false }));
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
export const handleUpdateDream = async (
  req: RequestType<UpdateDreamRequest>,
  res: ResponseType,
) => {
  const dreamId: number = Number(req.params.id);
  const dreamRepository = appDataSource.getRepository(Dream);
  const dream = await dreamRepository.findOneBy({ id: dreamId! });
  const updatedDream = await dreamRepository.save({ ...dream, ...req.body });
  res
    .status(httpStatus.OK)
    .json(jsonResponse({ success: true, data: { dream: updatedDream } }));
};
