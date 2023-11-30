import Joi from "joi";
import { UpdateUserRequest } from "types/user.types";

export const updateUserSchema = {
  body: Joi.object<UpdateUserRequest>().keys({
    name: Joi.string().required().max(50),
    description: Joi.string().max(300),
  }),
};
