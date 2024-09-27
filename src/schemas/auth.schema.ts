import { FEATURES } from "constants/feature.constants";
import Joi from "joi";
import type { NextFunction, Request, Response } from "express";
import type {
  ConfirmUserLoginWithCodeCredentials,
  CreatePasswordResetV2,
  UserCallbackV2,
  UserLoginCredentials,
  UserLoginCredentialsV2,
  UserLoginWithCodeCredentials,
  UserMagicLoginCredentialsV2,
  UserSignUpCredentials,
  UserSignUpCredentialsV2,
  UserVerifyCredentials,
} from "types/auth.types";
import { isFeatureActive } from "utils/feature.util";
import httpStatus from "http-status";
import { jsonResponse } from "utils/responses.util";
import { mapValidatorErrors } from "middlewares/validator.middleware";

export const signupSchema = {
  body: Joi.object<UserSignUpCredentials>({
    email: Joi.string().required().email(),
    username: Joi.string().email(),
    password: Joi.string().required().min(6),
    code: Joi.string().when("$isSignupCodeActive", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
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

export const validateSignupSchema = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  /**
   * get async schema
   */
  const isSignupCodeActive = await isFeatureActive(FEATURES.SIGNUP_WITH_CODE);
  const { error } = signupSchema.body.validate(req.body, {
    context: { isSignupCodeActive },
  });

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

export const callbackSchemaV2 = {
  query: Joi.object<UserCallbackV2>().keys({
    code: Joi.string().required(),
  }),
};

export const loginSchemaV2 = {
  body: Joi.object<UserLoginCredentialsV2>().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  }),
};

export const magicSchemaV2 = {
  body: Joi.object<UserMagicLoginCredentialsV2>().keys({
    email: Joi.string().required().email(),
    code: Joi.string(),
  }),
};

export const signupSchemaV2 = {
  body: Joi.object<UserSignUpCredentialsV2>({
    email: Joi.string().required().email(),
    firstname: Joi.string().required().max(50),
    lastname: Joi.string().required().max(50),
    // password: Joi.string().required().min(10),
    code: Joi.string().when("$isSignupCodeActive", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

export const createPasswordResetV2 = {
  body: Joi.object<CreatePasswordResetV2>({
    email: Joi.string().required().email(),
  }),
};
