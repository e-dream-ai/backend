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
      LOG_ROUTES.split(",").some((route) => {
        // check if it's a regex pattern (starts and ends with '/')
        if (route.startsWith("/") && route.endsWith("/")) {
          const pattern = route.slice(1, route.lastIndexOf("/"));
          return new RegExp(pattern).test(req.path);
        }
        // otherwise, treat as normal path prefix
        return req.path.startsWith(route);
      }));

  if (!shouldLog) {
    return next();
  }

  // Log request
  console.log({
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
    console.log({
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
