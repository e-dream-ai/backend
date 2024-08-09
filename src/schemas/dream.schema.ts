import Joi from "joi";
import { CompletedPart } from "@aws-sdk/client-s3";
import { ALLOWED_VIDEO_TYPES } from "constants/file.constants";
import {
  AbortMultipartUploadDreamRequest,
  CompleteMultipartUploadDreamRequest,
  ConfirmDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreatePresignedDreamRequest,
  DreamParamsRequest,
  DreamStatusType,
  GetDreamsQuery,
  RefreshMultipartUploadUrlRequest,
  UpdateDreamRequest,
} from "types/dream.types";
import { RequestValidationSchema } from "types/validator.types";

export const requestDreamSchema: RequestValidationSchema = {
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const getDreamsSchema: RequestValidationSchema = {
  query: Joi.object<GetDreamsQuery>().keys({
    status: Joi.string().valid(...Object.values(DreamStatusType)),
    skip: Joi.number(),
    take: Joi.number(),
    userId: Joi.number(),
  }),
};

export const updateDreamSchema: RequestValidationSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string(),
    activityLevel: Joi.number(),
    featureRank: Joi.number().integer(),
    displayedOwner: Joi.number().greater(0),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createPresignedDreamSchema: RequestValidationSchema = {
  body: Joi.object<CreatePresignedDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
};

export const confirmDreamSchema: RequestValidationSchema = {
  body: Joi.object<ConfirmDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createMultipartUploadDreamSchema: RequestValidationSchema = {
  body: Joi.object<CreateMultipartUploadDreamRequest>().keys({
    /**
     * uuid not required since this endpoint may be used to update a dream file
     */
    uuid: Joi.string().uuid(),
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    parts: Joi.number().greater(0).integer().required(),
  }),
};

export const refreshMultipartUploadUrlSchema: RequestValidationSchema = {
  body: Joi.object<RefreshMultipartUploadUrlRequest>().keys({
    uploadId: Joi.string().required(),
    part: Joi.number().required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const completeMultipartUploadDreamSchema: RequestValidationSchema = {
  body: Joi.object<CompleteMultipartUploadDreamRequest>().keys({
    name: Joi.string(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
    parts: Joi.array<CompletedPart>().required(),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const abortMultipartUploadDreamSchema: RequestValidationSchema = {
  body: Joi.object<AbortMultipartUploadDreamRequest>().keys({
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};
