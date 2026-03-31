import { CompletedPart } from "@aws-sdk/client-s3";
import { ALLOWED_IMAGE_TYPES } from "constants/file.constants";
import Joi from "joi";
import {
  CompleteMultipartUploadKeyframeRequest,
  CreateKeyframeRequest,
  CreateMultipartUploadFileRequest,
  GetKeyframeQuery,
  KeyframeParamsRequest,
  UpdateKeyframeRequest,
} from "types/keyframe.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestKeyframeSchema: RequestValidationSchema = {
  params: Joi.object<KeyframeParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const getKeyframesSchema: RequestValidationSchema = {
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

export const createMultipartUploadFileSchema: RequestValidationSchema = {
  body: Joi.object<CreateMultipartUploadFileRequest>().keys({
    extension: Joi.string()
      .valid(...ALLOWED_IMAGE_TYPES)
      .required(),
  }),
  params: Joi.object<KeyframeParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const completeMultipartUploadKeyframeSchema: RequestValidationSchema = {
  body: Joi.object<CompleteMultipartUploadKeyframeRequest>().keys({
    extension: Joi.string()
      .valid(...ALLOWED_IMAGE_TYPES)
      .required(),
    uploadId: Joi.string().required(),
    parts: Joi.array<CompletedPart>().required(),
  }),
  params: Joi.object<KeyframeParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};
