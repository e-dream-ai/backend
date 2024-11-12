import { APP_LOGGER } from "shared/logger";
import { NextFunction } from "express";
import { RequestType, ResponseType } from "types/express.types";
import env from "shared/env";

// Sanitize sensitive data
// @ts-expect-error no body type
function sanitizeBody(body) {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "key", "apiKey", "code"];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[HIDDEN]";
    }
  });

  return sanitized;
}

/**
 *
 * Handles requests and responses log
 *
 */
export const requestLogger = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  const LOG_ROUTES = env.LOG_ROUTES?.toLowerCase() ?? "none";

  const shouldLog =
    LOG_ROUTES.includes("all") ||
    (LOG_ROUTES !== "none" &&
      LOG_ROUTES.split(",").some((route) => req.path.startsWith(route.trim())));

  if (!shouldLog) {
    return next();
  }

  // Log request
  APP_LOGGER.info({
    msg: "Incoming request",
    req: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      headers: req.headers,
      body: sanitizeBody(req.body),
    },
  });

  // Capture original json
  const originalJson = res.json;
  res.json = function (body) {
    // Log response before sending
    APP_LOGGER.info({
      msg: "Outgoing response",
      res: {
        statusCode: res.statusCode,
        body: sanitizeBody(body),
      },
    });

    return originalJson.call(res, body);
  };

  next();
};
