import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { BUCKET_ACL } from "constants/aws/s3.constants";
import { MYME_TYPES, MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import { AVATAR } from "constants/multimedia.constants";
import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import appDataSource from "database/app-data-source";
import { Playlist, User } from "entities";
import { ApiKey } from "entities/ApiKey.entity";
import { Role } from "entities/Role.entity";
import httpStatus from "http-status";
import env from "shared/env";
import { FindOptionsWhere, ILike, IsNull, Not } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import {
  GetUsersQuery,
  UpdateUserRequest,
  UpdateUserRoleRequest,
} from "types/user.types";
import { generateBucketObjectURL } from "utils/aws/bucket.util";
import { decrypt } from "utils/crypto.util";
import { trackUserAction } from "utils/ga.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  getPlaylistFindOptionsRelations,
  getPlaylistSelectedColumns,
} from "utils/playlist.util";
import {
  handleForbidden,
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";
import {
  getRoleSelectedColumns,
  getUserFindOptionsRelations,
  getUserIdentifier,
  getUserSelectedColumns,
  isAdmin,
} from "utils/user.util";

const userRepository = appDataSource.getRepository(User);
const roleRepository = appDataSource.getRepository(Role);
const playlistRepository = appDataSource.getRepository(Playlist);
const apiKeyRepository = appDataSource.getRepository(ApiKey);

/**
 * Handles get roles
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - roles
 * BAD_REQUEST 400 - error getting roles
 *
 */
export const handleGetRoles = async (req: RequestType, res: ResponseType) => {
  try {
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.MAX_TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;
    const search = req.query.search ? String(req.query.search) : undefined;
    const whereSentence = {
      name: ILike(`%${search}%`),
    } as FindOptionsWhere<Role>;
    const [roles, count] = await roleRepository.findAndCount({
      where: search ? whereSentence : undefined,
      select: getRoleSelectedColumns(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { roles, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get users
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - users
 * BAD_REQUEST 400 - error getting users
 *
 */
export const handleGetUsers = async (
  req: RequestType<unknown, GetUsersQuery>,
  res: ResponseType,
) => {
  try {
    const take = Math.min(
      Number(req.query.take) || PAGINATION.TAKE,
      PAGINATION.MAX_TAKE,
    );
    const skip = Number(req.query.skip) || PAGINATION.SKIP;
    const search = req.query.search ? String(req.query.search) : undefined;
    const role = req.query.role;
    /**
     * users with a registered last login are verified users
     * this will find users with not null last_login_at
     */
    const whereSentence = {
      name: search ? ILike(`%${search}%`) : undefined,
      last_login_at: Not(IsNull()),
      role: role
        ? {
          name: role,
        }
        : undefined,
    } as FindOptionsWhere<User>;
    const [users, count] = await userRepository.findAndCount({
      where: whereSentence,
      select: getUserSelectedColumns(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { users, count } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

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
    const user = res.locals.user;
    const foundUser = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns({ userEmail: true }),
      relations: getUserFindOptionsRelations(),
    });

    if (!foundUser) {
      return handleNotFound(req, res);
    }

    const isAllowedView = canExecuteAction({
      isOwner: user?.id === foundUser?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    /**
     * remove user email if is not admin or owner
     */
    const responseUser = {
      ...foundUser,
      email: isAllowedView ? foundUser.email : undefined,
      signupInvite: isAllowedView ? foundUser.signupInvite : undefined,
    };

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { user: responseUser },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get users
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - users
 * BAD_REQUEST 400 - error getting users
 *
 */
export const handleGetCurrentUser = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user!;

    trackUserAction(String(user.id), "AUTHENTICATE", {
      workosUser: !!user?.workOSId,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { user },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get user current playlist
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - playlist
 * NOT_FOUND 404 - error getting playlist
 * BAD_REQUEST 400 - error getting playlist
 *
 */
export const handleGetCurrentPlaylist = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user;
    const currentPlaylistId = user?.currentPlaylist?.id;

    if (!currentPlaylistId) {
      return handleNotFound(req, res);
    }

    const playlist = await playlistRepository.findOne({
      where: { id: currentPlaylistId },
      select: getPlaylistSelectedColumns(),
      relations: getPlaylistFindOptionsRelations(),
    });

    if (!playlist) {
      return handleNotFound(req, res);
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { playlist },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
export const handleUpdateUser = async (
  req: RequestType<UpdateUserRequest>,
  res: ResponseType,
) => {
  try {
    const id = Number(req.params.id) || 0;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    const updateData: Partial<User> = {
      ...(req.body as Omit<UpdateUserRequest, "role">),
    };

    if (isAdmin(requestUser)) {
      const role = req.body.role
        ? await roleRepository.findOneBy({ id: req.body.role })
        : null;

      if (role) {
        updateData.role = role;
      }
    }

    await userRepository.update(user.id, updateData);

    const updatedUser = await userRepository.findOne({
      where: { id: user.id },
      select: getUserSelectedColumns({ userEmail: true }),
      relations: getUserFindOptionsRelations(),
    });

    /**
     * remove user email if is not admin or owner
     */
    const responseUser = {
      ...updatedUser,
      email: isAllowed ? updatedUser?.email : undefined,
    };

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: responseUser } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
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
  const requestUser = res.locals.user;

  try {
    const user = await userRepository.findOne({
      where: { id: id! },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: user.id === requestUser?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }

    // update playlist
    const avatarBuffer = req.file?.buffer;
    const bucketName = env.AWS_BUCKET_NAME;
    const fileMymeType = req.file?.mimetype;
    const fileExtension =
      MYME_TYPES_EXTENSIONS[fileMymeType ?? MYME_TYPES.JPEG];
    const fileName = `${AVATAR}.${fileExtension}`;
    const filePath = `${getUserIdentifier(user)}/${fileName}`;

    if (avatarBuffer) {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filePath,
        Body: avatarBuffer,
        ACL: BUCKET_ACL,
        CacheControl: "no-store",
        Expires: new Date(),
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
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles update user role
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - user
 * BAD_REQUEST 400 - error updating user role
 *
 */
export const handleUpdateRole = async (
  req: RequestType<UpdateUserRoleRequest>,
  res: ResponseType,
) => {
  try {
    const id = Number(req.params.id) || 0;
    const requestRole = req.body.role;
    const user = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns(),
      relations: getUserFindOptionsRelations(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const role = await roleRepository.findOneBy({ name: requestRole });
    user.role = role!;

    const updatedUser = await userRepository.save(user);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: updatedUser } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get apikey
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - apikey
 * BAD_REQUEST 400 - error getting apikey
 *
 */
export const handleGetApiKey = async (req: RequestType, res: ResponseType) => {
  try {
    const id = Number(req.params.id) || 0;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }
    const apikey = await apiKeyRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    if (!apikey) {
      return handleNotFound(req, res);
    }

    /**
     * decrypt api key to send to frontend
     */
    const decryptedKey = decrypt({
      iv: apikey.iv,
      content: apikey.apikey,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          apikey: {
            apikey: decryptedKey,
          },
        },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles generate apikey
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - apikey
 * BAD_REQUEST 400 - error generating apikey
 *
 */
export const handleGenerateApiKey = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const id = Number(req.params.id) || 0;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }
    const foundApikey = await apiKeyRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    if (foundApikey) {
      await apiKeyRepository.softRemove(foundApikey);
    }

    const apikey = new ApiKey();
    apikey.user = user;
    await apiKeyRepository.save(apikey);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles revoke apikey
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - apikey
 * BAD_REQUEST 400 - error revoking apikey
 *
 */
export const handleRevokeApiKey = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const id = Number(req.params.id) || 0;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { id },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req, res);
    }
    const foundApikey = await apiKeyRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    if (!foundApikey) {
      return handleNotFound(req, res);
    }

    await apiKeyRepository.softRemove(foundApikey);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req, res);
  }
};
