import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { NextFunction } from "express";
import httpStatus from "http-status";
import passport from "passport";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";

const requireAuth = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  return passport.authenticate(
    ["bearer", "headerapikey"],
    { session: false },
    (error: Error, user: User) => {
      if (error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
          jsonResponse({
            success: false,
            message: error.message ?? GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
          }),
        );
      }
      if (!user) {
        return res.status(httpStatus.NOT_FOUND).json(
          jsonResponse({
            success: false,
            message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
          }),
        );
      }
      /**
       * set on reqyest and response params
       */
      req.user = user;
      res.locals.user = user;
      next();
    },
  )(req, res, next);
};

export { requireAuth };
