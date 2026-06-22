import crypto from "crypto";
import { NextFunction } from "express";
import env from "shared/env";
import { RequestType, ResponseType } from "types/express.types";
import { handleUnauthorized } from "utils/responses.util";

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

export const requireInternalKey = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  const internalKey = req.headers["x-internal-key"];
  if (
    !env.INTERNAL_API_KEY ||
    typeof internalKey !== "string" ||
    !safeEqual(internalKey, env.INTERNAL_API_KEY)
  ) {
    return handleUnauthorized(req, res);
  }
  return next();
};
