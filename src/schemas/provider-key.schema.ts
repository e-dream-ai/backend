import Joi from "joi";
import { PROVIDERS } from "types/model.types";
import { RequestValidationSchema } from "types/validator.types";

const providerValues = Object.values(PROVIDERS);

export const upsertProviderKeySchema: RequestValidationSchema = {
  body: Joi.object().keys({
    provider: Joi.string()
      .valid(...providerValues)
      .required(),
    key: Joi.string()
      .trim()
      .pattern(/^[\x21-\x7e]+$/)
      .min(1)
      .required()
      .messages({
        "string.pattern.base": "Provider key has an invalid format.",
        "string.empty": "Provider key is required.",
        "any.required": "Provider key is required.",
      }),
  }),
};

export const getProviderKeySchema: RequestValidationSchema = {
  query: Joi.object().keys({
    provider: Joi.string()
      .valid(...providerValues)
      .required(),
  }),
};

export const deleteProviderKeySchema: RequestValidationSchema = {
  params: Joi.object().keys({
    provider: Joi.string()
      .valid(...providerValues)
      .required(),
  }),
};
