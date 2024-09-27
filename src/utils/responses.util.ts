import httpStatus from "http-status";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { APP_LOGGER } from "shared/logger";
import { JsonResponse } from "types/responses.types";
import { RequestType, ResponseType } from "types/express.types";
import { GenericServerException, OauthException } from "@workos-inc/node";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { User } from "entities";

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

// Unauthorized Handler
export const handleUnauthorized = (req: RequestType, res: ResponseType) => {
  res.status(httpStatus.UNAUTHORIZED).json(
    jsonResponse({
      success: false,
      message: GENERAL_MESSAGES.UNAUTHORIZED,
    }),
  );
};

// Forbidden Handler
export const handleForbidden = (req: RequestType, res: ResponseType) => {
  res.status(httpStatus.FORBIDDEN).json(
    jsonResponse({
      success: false,
      message: GENERAL_MESSAGES.FORBIDDEN,
    }),
  );
};

// Workos Error Handler
export const handleWorkosError = (
  error: unknown,
  req: RequestType,
  res: ResponseType,
) => {
  APP_LOGGER.error(error);
  let message: string | undefined;

  if (error instanceof GenericServerException) {
    message = error.message;
  } else if (error instanceof OauthException) {
    message = error.errorDescription;
  }

  return res
    .status(httpStatus.BAD_REQUEST)
    .json(jsonResponse({ success: false, message }));
};

// Workos Authenticated Response Handler
export const handleWorkosAuthenticatedResponse = (
  req: RequestType,
  res: ResponseType,
  data: {
    sealedSession?: string;
    user: User;
  },
) => {
  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      message: AUTH_MESSAGES.USER_LOGGED_IN,
      data: data,
    }),
  );
};
