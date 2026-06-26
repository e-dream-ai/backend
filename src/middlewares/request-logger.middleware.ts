import { NextFunction } from "express";
import { RequestType, ResponseType } from "types/express.types";
import env from "shared/env";

const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "key",
  "apikey",
  "code",
  "authorization",
  "secret",
  "cookie",
  "x-internal-key",
  "x-api-key",
]);

function sanitizeBody(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBody(item, depth + 1));
  }

  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [field, fieldValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      sanitized[field] = SENSITIVE_FIELDS.has(field.toLowerCase())
        ? "[HIDDEN]"
        : sanitizeBody(fieldValue, depth + 1);
    }
    return sanitized;
  }

  return value;
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
      headers: sanitizeBody(req.headers),
      body: JSON.stringify(sanitizeBody(req.body)),
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
        body: JSON.stringify(sanitizeBody(body)),
      },
    });

    return originalJson.call(res, body);
  };

  next();
};
