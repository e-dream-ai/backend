import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import Joi from "joi";

import type { ObjectSchema } from "joi";
import type { RequireAtLeastOne } from "types/utility.types";

type RequestValidationSchema = RequireAtLeastOne<
  Record<"body" | "query" | "params", ObjectSchema>
>;

/**
 * Handles validation of given schema
 *
 * @param {RequestValidationSchema} schema - schema, may contain optional: body, query, and params keys, each with a Joi schema object
 *
 * @returns Returns 400 BAD REQUEST if a validation error occurs
 *
 */
const validatorMiddleware =
  (schema: RequestValidationSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      const { error } = Joi.object(schema).validate(
        {
          body: req.body,
          query: req.query,
          params: req.params,
        },
        { abortEarly: false, stripUnknown: true },
      );

      // if there's no error, next()
      if (!error) {
        next();
      } else {
      // mapping erros to response
        const errors = error?.details.map((err) => ({
          field: err.path.join(", "),
          message: err.message,
        }));

        res.status(httpStatus.BAD_REQUEST).json({ errors });
      }
    };

export default validatorMiddleware;
