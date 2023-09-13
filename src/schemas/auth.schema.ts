import Joi from "joi";

import type {
  UserLoginCredentials,
  UserSignUpCredentials,
  UserVerifyCredentials,
} from "types/auth.types";

export const signupSchema = {
  body: Joi.object<UserSignUpCredentials>().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    username: Joi.string().required().min(2),
  }),
};

export const verifySchema = {
  body: Joi.object<UserVerifyCredentials>().keys({
    username: Joi.string().required(),
    code: Joi.string().required().length(6),
  }),
};

export const loginSchema = {
  body: Joi.object<UserLoginCredentials>().keys({
    username: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  }),
};
