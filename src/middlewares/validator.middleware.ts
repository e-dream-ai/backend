import type { NextFunction, Request } from "express";
import httpStatus from "http-status";
import Joi from "joi";
import { RequestValidationSchema } from "types/validator.types";
import { jsonResponse } from "utils/responses.util";
import { APP_LOGGER } from "shared/logger";
import { isAdmin } from "utils/user.util";
import { ResponseType } from "types/express.types";

export const mapValidatorErrors = (error: Joi.ValidationError | undefined) =>
  error?.details?.map((err) => ({
    field: err.path.join(", "),
    message: err.message,
  }));

/**
 * Handles validation of given schema
 *
 * @param {RequestValidationSchema} schema - schema, may contain optional: body, query, and params keys, each with a Joi schema object
 *
 * @returns Returns 400 BAD REQUEST if a validation error occurs
 *
 */
const validatorMiddleware = (schema: RequestValidationSchema) => {
  return (req: Request, res: ResponseType, next: NextFunction) => {
    const isUserAdmin = isAdmin(res.locals.user!);

    const { error } = Joi.object(schema).validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      {
        abortEarly: false,
        stripUnknown: true,
        // Adding context to validations
        // `isUserAdmin` indicates if logged user is admin
        context: { isUserAdmin },
      },
    );

    // if there's no error, next()
    if (!error) {
      next();
    } else {
      // mapping erros to response
      APP_LOGGER.error(error);
      const errors = mapValidatorErrors(error);

      res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          data: errors,
          message: error.message,
        }),
      );
    }
  };
};

export default validatorMiddleware;
