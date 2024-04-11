import Joi from "joi";
import { CompletedPart } from "@aws-sdk/client-s3";
import { ALLOWED_VIDEO_TYPES } from "constants/file.constants";
import {
  AbortMultipartUploadDreamRequest,
  CompleteMultipartUploadDreamRequest,
  ConfirmDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreatePresignedDreamRequest,
  DreamStatusType,
  GetDreamsQuery,
  RefreshMultipartUploadUrlRequest,
  UpdateDreamRequest,
} from "types/dream.types";

export const getDreamsSchema = {
  query: Joi.object<GetDreamsQuery>().keys({
    status: Joi.string().valid(...Object.values(DreamStatusType)),
    skip: Joi.number(),
    take: Joi.number(),
    userId: Joi.number(),
  }),
};

export const updateDreamSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string(),
    activityLevel: Joi.number(),
    featureRank: Joi.number(),
    displayedOwner: Joi.number().greater(0),
  }),
};

export const createPresignedDreamSchema = {
  body: Joi.object<CreatePresignedDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const confirmDreamSchema = {
  body: Joi.object<ConfirmDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const createMultipartUploadDreamSchema = {
  body: Joi.object<CreateMultipartUploadDreamRequest>().keys({
    uuid: Joi.string().uuid(),
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    parts: Joi.number().greater(0).integer().required(),
  }),
};

export const refreshMultipartUploadUrlSchema = {
  body: Joi.object<RefreshMultipartUploadUrlRequest>().keys({
    uploadId: Joi.string().required(),
    part: Joi.number().required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const completeMultipartUploadDreamSchema = {
  body: Joi.object<CompleteMultipartUploadDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
    parts: Joi.array<CompletedPart>().required(),
  }),
};

export const abortMultipartUploadDreamSchema = {
  body: Joi.object<AbortMultipartUploadDreamRequest>().keys({
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
  }),
};
