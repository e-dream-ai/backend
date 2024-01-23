import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import multer from "multer";
import { APP_LOGGER } from "shared/logger";
import { jsonResponse } from "utils/responses.util";

export const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 32 * 1024 * 1024 * 1024, // limit file size to 1024MB
  },
});

export const multerSingleFileMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const upload = multerInstance.single("file");
  return upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      APP_LOGGER.error(error);
      // A Multer error occurred when uploading.
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(jsonResponse({ success: false, message: error.message }));
    } else if (error) {
      APP_LOGGER.error(error);
      // An unknown error occurred when uploading.
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      );
    }
    // Everything went fine.
    next();
  });
};
