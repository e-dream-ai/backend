import { ROLES } from "constants/role.constants";
import Joi from "joi";
import { UpdateUserRequest, UpdateUserRoleRequest } from "types/user.types";

export const updateUserSchema = {
  body: Joi.object<UpdateUserRequest>().keys({
    name: Joi.string().required().max(50),
    description: Joi.string().max(300),
  }),
};

export const updateUserRoleSchema = {
  body: Joi.object<UpdateUserRoleRequest>().keys({
    role: Joi.string().required().valid(ROLES.ADMIN_GROUP, ROLES.USER_GROUP),
  }),
};
