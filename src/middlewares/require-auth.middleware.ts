import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { jsonResponse } from "utils/responses.util";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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
