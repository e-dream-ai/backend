import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";

export const errorMiddleware = (
  error: Error & { status?: number; statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Errors thrown by upstream middleware (e.g. body-parser's
  // PayloadTooLargeError -> 413) carry their own HTTP status. Honor it instead
  // of masking every error as a 500, so the client can distinguish a request it
  // sent that was too large/malformed from a genuine server fault.
  const status =
    error.statusCode ?? error.status ?? httpStatus.INTERNAL_SERVER_ERROR;
  const isServerError = status >= httpStatus.INTERNAL_SERVER_ERROR;

  // Only genuine server faults are logged at error level; client-caused 4xx
  // (oversized body, bad input) are warnings, not internal errors.
  if (isServerError) {
    APP_LOGGER.error(error);
  } else {
    APP_LOGGER.warn(error);
  }

  res.status(status).json({
    // Don't leak internals on 5xx; surface the real reason on 4xx.
    message: isServerError
      ? GENERAL_MESSAGES.INTERNAL_SERVER_ERROR
      : error.message ?? GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
  });
};
