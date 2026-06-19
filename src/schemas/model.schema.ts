import Joi from "joi";
import { DreamMediaType } from "types/dream.types";
import { GetModelsQuery } from "types/model.types";
import { RequestValidationSchema } from "types/validator.types";

export const getModelsSchema: RequestValidationSchema = {
  query: Joi.object<GetModelsQuery>().keys({
    mediaType: Joi.string()
      .valid(...Object.values(DreamMediaType))
      .optional(),
  }),
};
