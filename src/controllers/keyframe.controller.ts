import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import { Keyframe, User } from "entities";
import httpStatus from "http-status";
import { ILike } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import {
  CompleteMultipartUploadKeyframeRequest,
  CreateKeyframeRequest,
  GetKeyframeQuery,
  KeyframeParamsRequest,
  UpdateKeyframeRequest,
} from "types/keyframe.types";
import { canExecuteAction } from "utils/permissions.util";
import {
  findOneKeyframe,
  getKeyframeFindOptionsRelations,
  getKeyframeSelectedColumns,
} from "utils/keyframe.util";
import {
  handleNotFound,
  handleForbidden,
  jsonResponse,
  handleInternalServerError,
} from "utils/responses.util";
import { getUserIdentifier, isAdmin } from "utils/user.util";
import {
  completeMultipartUpload,
  createMultipartUpload,
  generateKeyframePath,
  getUploadPartSignedUrl,
} from "utils/r2.util";
import { CreateMultipartUploadFileRequest } from "types/keyframe.types";
import { generateBucketObjectURL } from "utils/cloudflare/bucket.util";
import { keyframeRepository, userRepository } from "database/repositories";

/**
 * Handles get keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error getting keyframe
 *
 */
export const handleGetKeyframe = async (
  req: RequestType<unknown, unknown, KeyframeParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  try {
    const keyframe = await findOneKeyframe({
      where: { uuid },
      select: getKeyframeSelectedColumns({}),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { keyframe } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error getting keyframe
 *
 */
export const handleGetKeyframes = async (
  req: RequestType<unknown, GetKeyframeQuery>,
  res: ResponseType,
) => {
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const userUUID: string = req.query.userUUID!;

  const search = req.query?.search
    ? { name: ILike(`%${req.query.search}%`) }
    : undefined;

  try {
    const [keyframes, count] = await keyframeRepository.findAndCount({
      where: { user: { uuid: userUUID }, ...search },
      select: getKeyframeSelectedColumns(),
      order: { updated_at: "DESC" },
      relations: getKeyframeFindOptionsRelations(),
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { keyframes, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles create keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error creating keyframe
 *
 */
export const handleCreateKeyframe = async (
  req: RequestType<CreateKeyframeRequest>,
  res: ResponseType,
) => {
  const { name } = req.body;
  const user = res.locals.user!;

  try {
    // create keyframe
    const keyframe = new Keyframe();
    keyframe.name = name;
    keyframe.user = user!;
    const createdKeyframe = await keyframeRepository.save(keyframe);

    return res
      .status(httpStatus.CREATED)
      .json(
        jsonResponse({ success: true, data: { keyframe: createdKeyframe } }),
      );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles create multipart upload with presigned urls to post keyframe image files
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - upload parts
 * BAD_REQUEST 400 - error creating parts
 *
 */
export const handleInitKeyframeImageUpload = async (
  req: RequestType<
    CreateMultipartUploadFileRequest,
    unknown,
    KeyframeParamsRequest
  >,
  res: ResponseType,
) => {
  // setting vars
  const user = res.locals.user;
  const keyframeUUID: string = req.params.uuid!;
  const fileExtension = req.body.extension!;

  try {
    // find keyframe
    const [keyframe] = await keyframeRepository.find({
      where: { uuid: keyframeUUID! },
      relations: { user: true },
      select: getKeyframeSelectedColumns(),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: keyframe.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }
    /**
     * keyframe owner uuid to generate r2 file path
     */
    const userIdentifier = getUserIdentifier(keyframe.user);

    /**
     * filePath r2 generation
     */
    const filePath = generateKeyframePath({
      userIdentifier,
      keyframeUUID,
      extension: fileExtension,
    });

    const uploadId = await createMultipartUpload(filePath!);
    const arrayUrls = Array.from({ length: 1 });
    const urls = await Promise.all(
      arrayUrls.map(
        async (_, index) =>
          await getUploadPartSignedUrl(filePath, uploadId!, index + 1),
      ),
    );
    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { keyframe, urls, uploadId },
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
 * OK 200 - keyframe image updated
 * BAD_REQUEST 400 - error updating keyframe image
 *
 */
export const handleCompleteKeyframeImageUpload = async (
  req: RequestType<
    CompleteMultipartUploadKeyframeRequest,
    unknown,
    KeyframeParamsRequest
  >,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const keyframeUUID: string = req.params.uuid!;
  const uploadId = req.body.uploadId!;
  const fileExtension = req.body.extension!;
  const parts = req.body.parts!;

  try {
    const [keyframe] = await keyframeRepository.find({
      where: { uuid: keyframeUUID! },
      relations: { user: true },
      select: getKeyframeSelectedColumns(),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: keyframe.user.id === user?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    /**
     * keyframe owner uuid to generate r2 file path
     */
    const userIdentifier = getUserIdentifier(keyframe.user);

    /**
     * filePath r2 generation, updates database values if needed
     */

    const filePath = generateKeyframePath({
      userIdentifier,
      keyframeUUID,
      extension: fileExtension,
    });

    await keyframeRepository.update(keyframe.id, {
      image: generateBucketObjectURL(filePath!),
    });

    /**
     * completes multipart upload with path, upload id and parts
     */
    await completeMultipartUpload(filePath!, uploadId!, parts!);

    return res
      .status(httpStatus.CREATED)
      .json(jsonResponse({ success: true, data: {} }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles update keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error updating keyframe
 *
 */
export const handleUpdateKeyframe = async (
  req: RequestType<UpdateKeyframeRequest, unknown, KeyframeParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const keyframe = await findOneKeyframe({
      where: { uuid },
      select: getKeyframeSelectedColumns({}),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: keyframe.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // Define an object to hold the fields that are allowed to be updated
    let updateData: Partial<Keyframe> = {
      ...(req.body as Omit<UpdateKeyframeRequest, "displayedOwner">),
    };

    let displayedOwner: User | null = null;
    if (isAdmin(user) && req.body.displayedOwner) {
      displayedOwner = await userRepository.findOneBy({
        id: req.body.displayedOwner,
      });
    }

    /**
     * update displayed owner for keyframe
     */
    if (displayedOwner) {
      updateData = { ...updateData, displayedOwner: displayedOwner };
    }

    await keyframeRepository.update(keyframe.id, {
      ...updateData,
    });

    const updatedKeyframe = await findOneKeyframe({
      where: { id: keyframe.id },
      select: getKeyframeSelectedColumns({}),
    });

    return res
      .status(httpStatus.OK)
      .json(
        jsonResponse({ success: true, data: { keyframe: updatedKeyframe } }),
      );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles delete image keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error deleting keyframe
 *
 */
export const handleDeleteImageKeyframe = async (
  req: RequestType<unknown, unknown, KeyframeParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const keyframe = await findOneKeyframe({
      where: { uuid },
      select: getKeyframeSelectedColumns(),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: keyframe.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const { affected } = await keyframeRepository.update(keyframe.id, {
      image: null,
    });

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
 * Handles delete keyframe
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - keyframe
 * BAD_REQUEST 400 - error deleting keyframe
 *
 */
export const handleDeleteKeyframe = async (
  req: RequestType<unknown, unknown, KeyframeParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  try {
    const keyframe = await findOneKeyframe({
      where: { uuid },
      select: getKeyframeSelectedColumns(),
    });

    if (!keyframe) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: keyframe.user.id === user.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    const affected = await keyframeRepository.softRemove(keyframe);

    if (!affected) {
      return handleNotFound(req as RequestType, res);
    }

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
