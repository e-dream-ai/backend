import path from "path";
import multer, { MulterError } from "multer";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { jsonResponse } from "utils/responses.util";
import { ALLOWED_IMAGE_TYPES } from "constants/file.constants";

export const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // limit file size to 25MB
  },
  // fileFilter fn to validate file allowed extensions
  fileFilter: (_, file, cb) => {
    // Get file extension removing '.'
    const ext = path.extname(file.originalname).toLowerCase().slice(1);

    // Validating images only since videos are uploaded directly to r2 using multipart upload
    const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_TYPES];

    // Check if extension is allowed
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(ext);

    if (isExtensionAllowed) {
      cb(null, true);
    } else {
      // Creating not allowed type error
      const allowedExtsString = ALLOWED_EXTENSIONS.join(", ");
      const fileTypeError = new MulterError("LIMIT_UNEXPECTED_FILE");
      fileTypeError.message = `File type not allowed. Allowed extensions: ${allowedExtsString}`;
      cb(fileTypeError);
    }
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
