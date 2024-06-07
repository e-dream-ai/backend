import { FEATURES } from "constants/feature.constants";
import Joi from "joi";

import type {
  ConfirmUserLoginWithCodeCredentials,
  UserLoginCredentials,
  UserLoginWithCodeCredentials,
  UserSignUpCredentials,
  UserVerifyCredentials,
} from "types/auth.types";
import { RequestValidationSchema } from "types/validator.types";
import { isFeatureActive } from "utils/feature.util";

export const getSignupSchema = async () => {
  const isSignupCodeActive = await isFeatureActive(FEATURES.SIGNUP_WITH_CODE);

  const signupSchema: RequestValidationSchema = {
    body: Joi.object<UserSignUpCredentials>()
      .keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().min(6),
        code: Joi.string().when("$isSignupCodeActive", {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
      })
      .prefs({ context: { isSignupCodeActive } }),
  };

  return signupSchema;
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
