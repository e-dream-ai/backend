import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
): void => {
  APP_LOGGER.error(error);
  res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
    message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
  });
};
