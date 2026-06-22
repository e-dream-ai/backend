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
      .required(),
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
