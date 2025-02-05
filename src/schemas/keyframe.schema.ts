import Joi from "joi";
import {
  CreateKeyframeRequest,
  GetKeyframeQuery,
  KeyframeParamsRequest,
  UpdateKeyframeRequest,
} from "types/keyframe.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestKeyframeSchema: RequestValidationSchema = {
  query: Joi.object<GetKeyframeQuery>().keys({
    take: Joi.number(),
    skip: Joi.number(),
    search: Joi.string(),
    userUUID: Joi.string().uuid(),
  }),
  params: Joi.object<KeyframeParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createKeyframeSchema: RequestValidationSchema = {
  body: Joi.object<CreateKeyframeRequest>().keys({
    name: Joi.string().required(),
  }),
};

export const updateKeyframeSchema: RequestValidationSchema = {
  body: Joi.object<UpdateKeyframeRequest>().keys({
    name: Joi.string().required().max(100),
  }),
  params: Joi.object<KeyframeParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};
