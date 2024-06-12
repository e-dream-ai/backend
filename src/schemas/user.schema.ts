import { ROLES } from "constants/role.constants";
import Joi from "joi";
import {
  GetUsersQuery,
  UpdateUserRequest,
  UpdateUserRoleRequest,
} from "types/user.types";

export const getUsersSchema = {
  query: Joi.object<GetUsersQuery>().keys({
    role: Joi.string().valid(...Object.values(ROLES)),
    skip: Joi.number(),
    take: Joi.number(),
    search: Joi.string(),
  }),
};

export const updateUserSchema = {
  body: Joi.object<UpdateUserRequest>().keys({
    name: Joi.string().optional().allow("").max(50),
    description: Joi.string().optional().allow("").max(300),
    role: Joi.number().greater(0).integer(),
  }),
};

export const updateUserRoleSchema = {
  body: Joi.object<UpdateUserRoleRequest>().keys({
    role: Joi.string().required().valid(ROLES.ADMIN_GROUP, ROLES.USER_GROUP),
  }),
};
