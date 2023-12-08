import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { NextFunction } from "express";
import httpStatus from "http-status";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";

const requireAuth = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  if (!res.locals.user) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        jsonResponse({ success: false, message: AUTH_MESSAGES.NOT_AUTHORIZED }),
      );
  }
  next();
};

export { requireAuth };
