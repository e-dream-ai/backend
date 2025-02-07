import Joi from "joi";
import { CompletedPart } from "@aws-sdk/client-s3";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "constants/file.constants";
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
  UpdateDreamProcessedRequest,
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
    userUUID: Joi.string(),
  }),
};

export const updateDreamSchema: RequestValidationSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string(),
    activityLevel: Joi.number(),
    featureRank: Joi.number().integer(),
    displayedOwner: Joi.number().greater(0),
    description: Joi.string().optional().allow("").max(4000),
    sourceUrl: Joi.string()
      .uri({
        scheme: ["http", "https"],
        allowRelative: false,
      })
      .optional()
      .allow("")
      .max(500)
      .messages({
        "string.uriCustomScheme":
          "Invalid URL format. URL must start with http:// or https://",
      }),
    nsfw: Joi.boolean(),
    ccbyLicense: Joi.boolean(),
    startKeyframe: Joi.string().uuid(),
    endKeyframe: Joi.string().uuid(),
  }),
  params: Joi.object<DreamParamsRequest>().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const updateDreamProcessedSchema: RequestValidationSchema = {
  body: Joi.object<UpdateDreamProcessedRequest>().keys({
    activityLevel: Joi.number(),
    processedVideoFPS: Joi.number(),
    processedVideoFrames: Joi.number().integer(),
    processedVideoSize: Joi.number().integer(),
    filmstrip: Joi.array<number>(),
    md5: Joi.string(),
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
    description: Joi.string().optional().allow("").max(4000),
    sourceUrl: Joi.string()
      .uri({
        scheme: ["http", "https"],
        allowRelative: false,
      })
      .optional()
      .allow("")
      .max(500)
      .messages({
        "string.uri":
          "Invalid URL format. URL must start with http:// or https://",
      }),
    nsfw: Joi.boolean(),
    ccbyLicense: Joi.boolean(),
  }),
};

export const createMultipartUploadFileSchema: RequestValidationSchema = {
  body: Joi.object<CreateMultipartUploadFileRequest>().keys({
    type: Joi.string()
      .valid(...Object.values(DreamFileType))
      .required(),
    extension: Joi.string()
      .valid(...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES)
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
      .valid(...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES)
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
      .valid(...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES)
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
