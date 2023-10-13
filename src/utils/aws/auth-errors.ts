import { CognitoIPSExceptions, JWTErrors } from "constants/aws/erros.constant";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import httpStatus from "http-status";

export const getErrorMessage: (errorName: string) => string = (errorName) => {
  let message: string;
  switch (errorName) {
    case JWTErrors.JSON_WEB_TOKEN_ERROR:
      message = AUTH_MESSAGES.USER_ALREADY_EXISTS;
      break;
    case JWTErrors.TOKEN_EXPIRED_ERROR:
      message = AUTH_MESSAGES.EXPIRED_TOKEN;
      break;
    case JWTErrors.NOT_BEFORE_ERROR:
      message = AUTH_MESSAGES.UNEXPECTED_ERROR;
      break;
    case CognitoIPSExceptions.USERNAME_EXISTS_EXCEPTION:
      message = AUTH_MESSAGES.USER_ALREADY_EXISTS;
      break;
    case CognitoIPSExceptions.INVALID_PARAMETER_EXCEPTION:
      message = AUTH_MESSAGES.INVALID_PARAMETERS;
      break;
    case CognitoIPSExceptions.TOO_MANY_REQUESTS_EXCEPTION:
      message = AUTH_MESSAGES.TOO_MANY_REQUESTS;
      break;
    case CognitoIPSExceptions.CODE_MISMATCH_EXCEPTION:
      message = AUTH_MESSAGES.CODE_MISMATCH;
      break;
    case CognitoIPSExceptions.EXPIRED_CODE_EXCEPTION:
      message = AUTH_MESSAGES.EXPIRED_CODE;
      break;
    case CognitoIPSExceptions.NOT_AUTHORIZED_EXCEPTION:
      message = AUTH_MESSAGES.INVALID_CREDENTIALS;
      break;
    case CognitoIPSExceptions.PASSWORD_RESET_REQUIRED_EXCEPTION:
      message = AUTH_MESSAGES.PASSWORD_RESET_REQUIRED;
      break;
    case CognitoIPSExceptions.USER_NOT_CONFIRMED_EXCEPTION:
      message = AUTH_MESSAGES.USER_NOT_CONFIRMED;
      break;
    default:
      message = AUTH_MESSAGES.UNEXPECTED_ERROR;
  }

  return message;
};

export const getErrorCode: (errorName: string) => number = (errorName) => {
  let code: number;
  switch (errorName) {
    case JWTErrors.JSON_WEB_TOKEN_ERROR:
      code = httpStatus.BAD_REQUEST;
      break;
    case JWTErrors.TOKEN_EXPIRED_ERROR:
      code = httpStatus.UNAUTHORIZED;
      break;
    case JWTErrors.NOT_BEFORE_ERROR:
      code = httpStatus.BAD_REQUEST;
      break;
    default:
      code = httpStatus.BAD_REQUEST;
  }

  return code;
};
