import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "clients/r2.client";

import { MYME_TYPES, MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import { AVATAR } from "constants/multimedia.constants";
import { PAGINATION } from "constants/pagination.constants";
import { ROLES } from "constants/role.constants";
import {
  apiKeyRepository,
  roleRepository,
  userRepository,
} from "database/repositories";
import { User } from "entities";
import { ApiKey } from "entities/ApiKey.entity";
import { Role } from "entities/Role.entity";
import httpStatus from "http-status";
import env from "shared/env";
import { FindOptionsWhere, ILike, In } from "typeorm";
import { RequestType, ResponseType } from "types/express.types";
import {
  GetUsersQuery,
  GetVotedDreamsRequest,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  UserParamsRequest,
} from "types/user.types";
import { decrypt } from "utils/crypto.util";
import { getVotedDreams } from "utils/dream.util";
import { canExecuteAction } from "utils/permissions.util";
import {
  findOnePlaylist,
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
  getUserDownvotedDreams,
  getUserFindOptionsRelations,
  getUserIdentifier,
  getUserSelectedColumns,
  isAdmin,
} from "utils/user.util";
import { workos } from "utils/workos.util";
import {
  transformUsersWithSignedUrls,
  transformUserWithSignedUrls,
  transformDreamsWithSignedUrls,
} from "utils/transform.util";

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
    let roleFilter: FindOptionsWhere<Role> | undefined;
    if (role) {
      if (role === ROLES.ADMIN_GROUP) {
        roleFilter = { name: role };
      } else if (role === ROLES.CREATOR_GROUP) {
        roleFilter = { name: In([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]) };
      } else if (role === ROLES.USER_GROUP) {
        roleFilter = {
          name: In([ROLES.USER_GROUP, ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
        };
      } else {
        roleFilter = { name: role };
      }
    } else {
      roleFilter = {
        name: In([ROLES.USER_GROUP, ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
      };
    }
    const baseConditions = {
      verified: true,
      role: roleFilter,
    };
    const whereSentence = search
      ? [
        {
          ...baseConditions,
          name: ILike(`%${search}%`),
        },
        {
          ...baseConditions,
          email: ILike(`%${search}%`),
        },
      ]
      : (baseConditions as FindOptionsWhere<User>);
    const [users, count] = await userRepository.findAndCount({
      where: whereSentence,
      select: getUserSelectedColumns(),
      order: { created_at: "DESC" },
      take,
      skip,
    });

    const transformedUsers = await transformUsersWithSignedUrls(users);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { users: transformedUsers, count },
      }),
    );
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
export const handleGetUser = async (
  req: RequestType<unknown, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const user = res.locals.user;
    const foundUser = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns({ userEmail: true }),
      relations: getUserFindOptionsRelations(),
    });

    if (!foundUser) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowedView = canExecuteAction({
      isOwner: user?.id === foundUser?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: user?.role?.name,
    });

    // Transform user to include signed URLs first
    const transformedUser = await transformUserWithSignedUrls(foundUser);

    /**
     * remove user email if is not admin or owner
     */
    const responseUser = {
      ...transformedUser,
      email: isAllowedView ? transformedUser.email : undefined,
      signupInvite: isAllowedView ? transformedUser.signupInvite : undefined,
    };

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { user: responseUser },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};

/**
 * Handles get dreams voted by user
 *
 * @param {RequestType} req - Request object
 * @param {Response} res - Response object
 *
 * @returns {Response} Returns response
 * OK 200 - dreams
 * BAD_REQUEST 400 - error getting dreams
 *
 */
export const handleGetVotedDreams = async (
  req: RequestType<unknown, GetVotedDreamsRequest, UserParamsRequest>,
  res: ResponseType,
) => {
  const uuid = req.params.uuid!;
  const take = Math.min(
    Number(req.query.take) || PAGINATION.TAKE,
    PAGINATION.MAX_TAKE,
  );
  const skip = Number(req.query.skip) || PAGINATION.SKIP;
  const type = req.query.type;

  try {
    const { count, dreams } = await getVotedDreams(uuid, {
      take,
      skip,
      voteType: type,
    });
    const transformedDreams = await transformDreamsWithSignedUrls(dreams);
    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { count, dreams: transformedDreams },
      }),
    );
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
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
export const handleGetAuthenticatedUser = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user!;

    // Transform user to include signed URLs
    const transformedUser = await transformUserWithSignedUrls(user);

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { user: transformedUser },
      }),
    );
  } catch (err) {
    const error = err as Error;
    console.error(error);
    return handleInternalServerError(error, req, res);
  }
};

/**
 * Handles get user authenticated playlist
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
export const handleGetAuthenticatedUserPlaylist = async (
  req: RequestType,
  res: ResponseType,
) => {
  try {
    const user = res.locals.user;
    const isUserAdmin = isAdmin(user);
    const currentPlaylistId = user?.currentPlaylist?.id;

    if (!currentPlaylistId) {
      return handleNotFound(req, res);
    }

    const playlist = await findOnePlaylist({
      where: { id: currentPlaylistId },
      select: getPlaylistSelectedColumns(),
      filter: {
        userId: user.id,
        isAdmin: isUserAdmin,
        nsfw: user?.nsfw,
      },
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
  req: RequestType<UpdateUserRequest, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
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

      if (role && user.workOSId) {
        const list = await workos.userManagement.listOrganizationMemberships({
          organizationId: env.WORKOS_ORGANIZATION_ID,
          userId: user.workOSId,
        });

        let organizationMembership = list?.data[0];

        if (!organizationMembership) {
          organizationMembership =
            await workos.userManagement.createOrganizationMembership({
              userId: user.workOSId,
              organizationId: env.WORKOS_ORGANIZATION_ID,
              roleSlug: role.name,
            });
        }

        await workos.userManagement.updateOrganizationMembership(
          organizationMembership.id,
          {
            roleSlug: role.name,
          },
        );
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
    return handleInternalServerError(error, req as RequestType, res);
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
  req: RequestType<unknown, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  const uuid = req.params.uuid!;
  const requestUser = res.locals.user;

  try {
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const isAllowed = canExecuteAction({
      isOwner: user.id === requestUser?.id,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }

    // update playlist
    const avatarBuffer = req.file?.buffer;
    const bucketName = env.R2_BUCKET_NAME;
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
        ContentType: fileMymeType || "image/jpeg",
        CacheControl: "no-store",
        Expires: new Date(),
      });
      await r2Client.send(command);
    }

    const updatedUser = await userRepository.save({
      ...user,
      avatar: avatarBuffer ? filePath : null,
    });

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: updatedUser } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
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
  req: RequestType<UpdateUserRoleRequest, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const requestRole = req.body.role;
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
      relations: getUserFindOptionsRelations(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const role = await roleRepository.findOneBy({ name: requestRole });
    user.role = role!;

    const updatedUser = await userRepository.save(user);

    return res
      .status(httpStatus.OK)
      .json(jsonResponse({ success: true, data: { user: updatedUser } }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
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
export const handleGetApiKey = async (
  req: RequestType<unknown, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }
    const apikey = await apiKeyRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    if (!apikey) {
      return handleNotFound(req as RequestType, res);
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
    return handleInternalServerError(error, req as RequestType, res);
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
  req: RequestType<unknown, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
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
    return handleInternalServerError(error, req as RequestType, res);
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
  req: RequestType<unknown, unknown, UserParamsRequest>,
  res: ResponseType,
) => {
  try {
    const uuid = req.params.uuid!;
    const requestUser = res.locals.user;
    const user = await userRepository.findOne({
      where: { uuid },
      select: getUserSelectedColumns(),
    });

    if (!user) {
      return handleNotFound(req as RequestType, res);
    }

    const isOwner = user.id === requestUser?.id;
    const isAllowed = canExecuteAction({
      isOwner,
      allowedRoles: [ROLES.ADMIN_GROUP],
      userRole: requestUser?.role?.name,
    });

    if (!isAllowed) {
      return handleForbidden(req as RequestType, res);
    }
    const foundApikey = await apiKeyRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    if (!foundApikey) {
      return handleNotFound(req as RequestType, res);
    }

    await apiKeyRepository.softRemove(foundApikey);

    return res.status(httpStatus.OK).json(jsonResponse({ success: true }));
  } catch (err) {
    const error = err as Error;
    return handleInternalServerError(error, req as RequestType, res);
  }
};
