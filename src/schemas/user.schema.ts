import { ROLES } from "constants/role.constants";
import Joi from "joi";
import {
  GetUsersQuery,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  UserParamsRequest,
} from "types/user.types";
import { NextFunction } from "express";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import { mapValidatorErrors } from "middlewares/validator.middleware";
import { RequestValidationSchema } from "types/validator.types";

export const requestUserSchema: RequestValidationSchema = {
  params: Joi.object<UserParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const getUsersSchema = {
  query: Joi.object<GetUsersQuery>().keys({
    role: Joi.string().valid(...Object.values(ROLES)),
    skip: Joi.number(),
    take: Joi.number(),
    search: Joi.string().optional().allow(""),
  }),
};

export const updateUserSchema = {
  body: Joi.object<UpdateUserRequest>().keys({
    name: Joi.string().optional().allow("").max(50),
    description: Joi.string().optional().allow("").max(300),
    role: Joi.number().greater(0).integer(),
    nsfw: Joi.boolean().optional(),
    enableMarketingEmails: Joi.boolean().optional(),
    quota: Joi.number().greater(0).integer().optional(),
  }),
};

export const updateUserRoleSchema = {
  body: Joi.object<UpdateUserRoleRequest>().keys({
    role: Joi.string().required().valid(ROLES.ADMIN_GROUP, ROLES.USER_GROUP),
  }),
};

export const validateUserSchema = async (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  const user = res.locals.user;
  const role = user?.role.name;
  let schema;

  if (role !== ROLES.ADMIN_GROUP) {
    // quota is allowed to be updated only by admins
    schema = updateUserSchema.body.keys({
      quota: Joi.forbidden(),
    });
  } else {
    schema = updateUserSchema.body.keys();
  }

  /**
   * get async schema
   */
  const { error } = schema.validate(req.body);

  if (error) {
    const errors = mapValidatorErrors(error);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(
        jsonResponse({ success: false, data: errors, message: error.message }),
      );
  }

  next();
};
