import Joi from "joi";
import { GetDreamsQuery, GetDreamsRequestQuery } from "types/client.types";
import { RequestValidationSchema } from "types/validator.types";

export const clientDreamsSchema: RequestValidationSchema = {
  query: Joi.object<GetDreamsQuery>().keys({
    uuids: Joi.string().required(),
  }),
};

export const clientDreamsRequestSchema: RequestValidationSchema = {
  body: Joi.object<GetDreamsRequestQuery>().keys({
    uuids: Joi.array().items(Joi.string().uuid()).required(),
  }),
};
