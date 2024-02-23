import httpStatus from "http-status";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { APP_LOGGER } from "shared/logger";
import { JsonResponse } from "types/responses.types";
import { RequestType, ResponseType } from "types/express.types";

export const jsonResponse: (response: JsonResponse) => JsonResponse = (
  response,
) => response;

// Internal Server Error Handler
export const handleInternalServerError = (
  error: Error,
  req: RequestType,
  res: ResponseType,
) => {
  APP_LOGGER.error(error);
  res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
    jsonResponse({
      success: false,
      message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
    }),
  );
};

// Not Found Handler
export const handleNotFound = (req: RequestType, res: ResponseType) => {
  res.status(httpStatus.NOT_FOUND).json(
    jsonResponse({
      success: false,
      message: GENERAL_MESSAGES.NOT_FOUND,
    }),
  );
};
