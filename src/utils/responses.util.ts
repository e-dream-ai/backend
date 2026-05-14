import httpStatus from "http-status";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { APP_LOGGER } from "shared/logger";
import { JsonResponse } from "types/responses.types";
import {
  RequestType,
  ResponseOptions,
  ResponseType,
} from "types/express.types";
import {
  BadRequestException,
  GenericServerException,
  OauthException,
  RateLimitExceededException,
  UnprocessableEntityException,
} from "@workos-inc/node";
import {
  AUTH_ERROR_CODES,
  AUTH_MESSAGES,
  AuthErrorCode,
} from "constants/messages/auth.constant";
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
export const handleNotFound = (
  req: RequestType,
  res: ResponseType,
  options: ResponseOptions = {},
) => {
  res.status(httpStatus.NOT_FOUND).json(
    jsonResponse({
      success: false,
      message: options?.message ?? GENERAL_MESSAGES.NOT_FOUND,
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

const mapOauthErrorToCode = (oauthError: string | undefined): AuthErrorCode => {
  switch (oauthError) {
    case "invalid_grant":
      return AUTH_ERROR_CODES.INVALID_CODE;
    case "invalid_request":
      return AUTH_ERROR_CODES.BAD_REQUEST;
    default:
      return AUTH_ERROR_CODES.UNKNOWN;
  }
};

// Workos Error Handler
export const handleWorkosError = (
  error: unknown,
  req: RequestType,
  res: ResponseType,
) => {
  APP_LOGGER.error(error);

  if (error instanceof RateLimitExceededException) {
    const retryAfterSeconds = error.retryAfter ?? 60;
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(httpStatus.TOO_MANY_REQUESTS).json(
      jsonResponse({
        success: false,
        message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
        errorCode: AUTH_ERROR_CODES.RATE_LIMITED,
        retryAfterSeconds,
      }),
    );
  }

  if (error instanceof OauthException) {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message: error.errorDescription ?? AUTH_MESSAGES.AUTHENTICATION_FAILED,
        errorCode: mapOauthErrorToCode(error.error),
      }),
    );
  }

  if (
    error instanceof BadRequestException ||
    error instanceof UnprocessableEntityException
  ) {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message: error.message,
        errorCode: AUTH_ERROR_CODES.BAD_REQUEST,
      }),
    );
  }

  if (error instanceof GenericServerException) {
    const status =
      error.status >= 500
        ? httpStatus.SERVICE_UNAVAILABLE
        : httpStatus.BAD_REQUEST;
    const isCodeLockedOut =
      status === httpStatus.BAD_REQUEST &&
      /too many failed attempts/i.test(error.message);

    return res.status(status).json(
      jsonResponse({
        success: false,
        message: isCodeLockedOut
          ? AUTH_MESSAGES.CODE_LOCKED_OUT
          : error.message,
        errorCode: isCodeLockedOut
          ? AUTH_ERROR_CODES.CODE_LOCKED_OUT
          : AUTH_ERROR_CODES.UNKNOWN,
      }),
    );
  }

  return res.status(httpStatus.BAD_REQUEST).json(
    jsonResponse({
      success: false,
      message: AUTH_MESSAGES.UNEXPECTED_ERROR,
      errorCode: AUTH_ERROR_CODES.UNKNOWN,
    }),
  );
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
