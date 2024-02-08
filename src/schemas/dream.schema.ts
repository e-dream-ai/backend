import { ALLOWED_VIDEO_TYPES } from "constants/file.constants";
import Joi from "joi";
import {
  ConfirmDreamRequest,
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
    extension: Joi.string().valid(...ALLOWED_VIDEO_TYPES),
  }),
};

export const confirmDreamSchema = {
  body: Joi.object<ConfirmDreamRequest>().keys({
    name: Joi.string().max(100),
    extension: Joi.string().valid(...ALLOWED_VIDEO_TYPES),
  }),
};
