import Joi from "joi";
import { CreateDreamRequest, UpdateDreamRequest } from "types/dream.types";

export const createDreamSchema = {
  body: Joi.object<CreateDreamRequest>().keys({
    files: Joi.object(),
  }),
};

export const updateDreamSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string(),
    video: Joi.string(),
    thumbnail: Joi.string(),
  }),
};
