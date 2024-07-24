import { NextFunction } from "express";
import httpStatus from "http-status";
import { JsonWebTokenError } from "jsonwebtoken";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { RequestType, ResponseType } from "types/express.types";
import { getErrorCode, getErrorMessage } from "utils/aws/auth-errors";
import { jsonResponse } from "utils/responses.util";
import { validateCognitoJWT } from "utils/auth.util";

/**
 * next to be deprecated
 */
const authMiddleware = async (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  if (!req.headers.authorization) {
    return next();
  }
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    const validatedToken = await validateCognitoJWT(accessToken);
    const { username } = validatedToken;
    const user = await fetchUserByCognitoId(username);

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.USER_NOT_FOUND,
        }),
      );
    }

    res.locals.user = user;
    res.locals.accessToken = accessToken;
  } catch (error) {
    APP_LOGGER.error(error);
    const jwtError = error as JsonWebTokenError;
    const message: string = getErrorMessage(jwtError.name);
    const code: number = getErrorCode(jwtError.name);

    return res.status(code).json(jsonResponse({ success: false, message }));
  }

  next();
};

export default authMiddleware;
