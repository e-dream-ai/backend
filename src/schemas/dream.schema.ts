import Joi from "joi";
import { CompletedPart } from "@aws-sdk/client-s3";
import { ALLOWED_VIDEO_TYPES } from "constants/file.constants";
import {
  AbortMultipartUploadDreamRequest,
  CompleteMultipartUploadDreamRequest,
  CreateMultipartUploadDreamRequest,
  CreateMultipartUploadFileRequest,
  DreamFileType,
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

export const createMultipartUploadFileSchema: RequestValidationSchema = {
  body: Joi.object<CreateMultipartUploadFileRequest>().keys({
    type: Joi.string()
      .valid(...Object.values(DreamFileType))
      .required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    parts: Joi.number().greater(0).integer().required(),
    frameNumber: Joi.number().when("type", {
      is: DreamFileType.FILMSTRIP,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    processed: Joi.boolean().when("type", {
      is: DreamFileType.DREAM,
      then: Joi.boolean(),
      otherwise: Joi.forbidden(),
    }),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const refreshMultipartUploadUrlSchema: RequestValidationSchema = {
  body: Joi.object<RefreshMultipartUploadUrlRequest>().keys({
    uploadId: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(DreamFileType))
      .required(),
    part: Joi.number().required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    frameNumber: Joi.number().when("type", {
      is: DreamFileType.FILMSTRIP,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    processed: Joi.boolean().when("type", {
      is: DreamFileType.DREAM,
      then: Joi.boolean(),
      otherwise: Joi.forbidden(),
    }),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const completeMultipartUploadDreamSchema: RequestValidationSchema = {
  body: Joi.object<CompleteMultipartUploadDreamRequest>().keys({
    type: Joi.string()
      .valid(...Object.values(DreamFileType))
      .required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES)
      .required(),
    uploadId: Joi.string().required(),
    parts: Joi.array<CompletedPart>().required(),
    frameNumber: Joi.number().when("type", {
      is: DreamFileType.FILMSTRIP,
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    processed: Joi.boolean().when("type", {
      is: DreamFileType.DREAM,
      then: Joi.boolean(),
      otherwise: Joi.forbidden(),
    }),
    name: Joi.string().when("type", {
      is: DreamFileType.DREAM,
      then: Joi.string(),
      otherwise: Joi.forbidden(),
    }),
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
