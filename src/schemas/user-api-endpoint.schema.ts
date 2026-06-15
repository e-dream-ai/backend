import Joi from "joi";
import {
  CreateUserApiEndpointRequest,
  UpdateUserApiEndpointRequest,
} from "types/user-api-endpoint.types";
import { RequestValidationSchema } from "types/validator.types";

const providerTypes = ["openai", "fal"] as const;

const capabilitiesSchema = Joi.object({
  textToImage: Joi.boolean().required(),
  imageToImage: Joi.boolean().required(),
  sizes: Joi.array().items(Joi.string()).required(),
});

const httpsUrl = Joi.string().uri({ scheme: ["https"] });

export const endpointParamsSchema: RequestValidationSchema = {
  params: Joi.object().keys({
    uuid: Joi.string().uuid().required(),
  }),
};

export const createUserApiEndpointSchema: RequestValidationSchema = {
  body: Joi.object<CreateUserApiEndpointRequest>().keys({
    name: Joi.string().required().max(255),
    providerType: Joi.string()
      .valid(...providerTypes)
      .required(),
    presetId: Joi.string().required(),
    endpointUrl: httpsUrl.required(),
    apiKey: Joi.string().required(),
    modelId: Joi.string().required(),
    capabilities: capabilitiesSchema.required(),
  }),
};

export const updateUserApiEndpointSchema: RequestValidationSchema = {
  body: Joi.object<UpdateUserApiEndpointRequest>().keys({
    name: Joi.string().max(255),
    endpointUrl: httpsUrl,
    apiKey: Joi.string(),
    modelId: Joi.string(),
    capabilities: capabilitiesSchema,
  }),
  params: Joi.object().keys({
    uuid: Joi.string().uuid().required(),
  }),
};
