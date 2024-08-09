import Joi from "joi";
import { GetDreamsQuery } from "types/client.types";
import { RequestValidationSchema } from "types/validator.types";

export const clientDreamsSchema: RequestValidationSchema = {
  query: Joi.object<GetDreamsQuery>().keys({
    uuids: Joi.string().required(),
  }),
};
