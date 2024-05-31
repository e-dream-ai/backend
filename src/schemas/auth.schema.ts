import Joi from "joi";

import type {
  ConfirmUserLoginWithCodeCredentials,
  UserLoginCredentials,
  UserLoginWithCodeCredentials,
  UserSignUpCredentials,
  UserVerifyCredentials,
} from "types/auth.types";

export const signupSchema = {
  body: Joi.object<UserSignUpCredentials>().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    code: Joi.string().required(),
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

export const loginWithCodeSchema = {
  body: Joi.object<UserLoginWithCodeCredentials>().keys({
    username: Joi.string().required(),
  }),
};

export const confirmLoginWithCodeSchema = {
  body: Joi.object<ConfirmUserLoginWithCodeCredentials>().keys({
    username: Joi.string().required(),
    code: Joi.string().required(),
    session: Joi.string().required(),
  }),
};
