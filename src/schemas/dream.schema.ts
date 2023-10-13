import Joi from "joi";
import { UpdateDreamRequest } from "types/dream.types";

export const updateDreamSchema = {
  body: Joi.object<UpdateDreamRequest>().keys({
    name: Joi.string(),
  }),
};
