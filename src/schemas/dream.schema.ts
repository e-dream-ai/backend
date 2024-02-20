import { ALLOWED_VIDEO_TYPES } from "constants/file.constants";
import Joi from "joi";
import {
  CompleteMultipartUploadDreamRequest,
  ConfirmDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreatePresignedDreamRequest,
  UpdateDreamRequest,
} from "types/dream.types";

export const updateDreamSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string().max(100),
    activityLevel: Joi.number(),
  }),
};

export const createPresignedDreamSchema = {
  body: Joi.object<CreatePresignedDreamRequest>().keys({
    name: Joi.string().max(100),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const confirmDreamSchema = {
  body: Joi.object<ConfirmDreamRequest>().keys({
    name: Joi.string().max(100),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const createMultipartUploadDreamSchema = {
  body: Joi.object<CreateMultipartUploadDreamRequest>().keys({
    name: Joi.string().max(100),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    parts: Joi.number().greater(1).required(),
  }),
};

export const completeMultipartUploadDreamSchema = {
  body: Joi.object<CompleteMultipartUploadDreamRequest>().keys({
    name: Joi.string().max(100),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
    parts: Joi.number().greater(1).required(),
  }),
};
