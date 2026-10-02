import Joi from "joi";
import { GetStylePresetsQuery } from "types/style-preset.types";
import { RequestValidationSchema } from "types/validator.types";
import { SUPPORTED_ALGORITHMS } from "utils/prompt.util";

export const getStylePresetsSchema: RequestValidationSchema = {
  query: Joi.object<GetStylePresetsQuery>().keys({
    model: Joi.string().valid(...SUPPORTED_ALGORITHMS),
  }),
};
