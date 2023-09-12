import type { Request, Response } from "express";
import httpStatus from "http-status";

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
): void => {
  res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
};
