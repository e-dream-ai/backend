import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
import { MYME_TYPES, MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { AVATAR } from "constants/multimedia.constants";
import appDataSource from "database/app-data-source";
import { User } from "entities";
import httpStatus from "http-status";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { RequestType, ResponseType } from "types/express.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { jsonResponse } from "utils/responses.util";

/**
 * Handles get user
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user
 * BAD_REQUEST 400 - error getting user
 *
 */
export const handleGetUser = async (req: RequestType, res: ResponseType) => {
  try {
    const id = Number(req.params.id) || 0;

    const userRepository = appDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user } }));
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
 * Handles update user
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - update
 * BAD_REQUEST 400 - error updating user
 *
 */
export const handleUpdateUser = async (req: RequestType, res: ResponseType) => {
  try {
    const id = Number(req.params.id) || 0;

    const userRepository = appDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    const updatedUser = await userRepository.save({ ...user, ...req.body });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: updatedUser } }));
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
 * Handles update user avatar
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user avatar updated
 * BAD_REQUEST 400 - error updating user avatar
 *
 */
export const handleUpdateUserAvatar = async (
  req: RequestType,
  res: ResponseType,
) => {
  const id: number = Number(req.params.id) || 0;

  try {
    const userRepository = appDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: id! },
    });

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.NOT_FOUND,
        }),
      );
    }

    // if (user.id !== user?.id) {
    //   return res.status(httpStatus.UNAUTHORIZED).json(
    //     jsonResponse({
    //       success: false,
    //       message: GENERAL_MESSAGES.UNAUTHORIZED,
    //     }),
    //   );
    // }

    // update playlist
    const avatarBuffer = req.file?.buffer;
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension =
      MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.JPEG];
    const fileName = `${AVATAR}.${fileExtension}`;
    const filePath = `${user?.cognitoId}/${fileName}`;

    if (avatarBuffer) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        Body: avatarBuffer,
        ACL: BUCKET_ACL,
      });
      await s3Client.send(command);
    }

    const updatedUser = await userRepository.save({
      ...user,
      avatar: avatarBuffer ? generateBucketObjectURL(filePath) : null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: updatedUser } }));
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
