import Joi from "joi";
import { UpdateFeatureRequest } from "types/feature.types";

export const updateFeatureSchema = {
  body: Joi.object<UpdateFeatureRequest>().keys({
    name: Joi.string().required().max(500),
    isActive: Joi.boolean().required(),
  }),
};
