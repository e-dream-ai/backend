import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { NextFunction } from "express";
import httpStatus from "http-status";
import passport from "passport";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import {
  authenticateAndGetWorkOSSession,
  handleWorkOSAuthFailure,
  refreshWorkOSSession,
  setWorkOSUserContext,
  updateWorkOSCookie,
} from "utils/workos.util";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";

/**
 * Callback handler for passport authenticate strategies
 * @param req
 * @param res
 * @param next
 */
const handleAuthCallback = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  return (
    error: Error,
    user: User,
    info: { message?: string }[] | string[],
  ) => {
    if (error) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
        jsonResponse({
          success: false,
          message: GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
        }),
      );
    }
    if (!user) {
      /**
       * get error message
       * BearerStrategy and HeaderAPIKeyStrategy work different on info handling
       * BearerStrategy uses OAuth 2.0 error response format, this is the reason why error message is extracted different here
       */
      const errorMessage =
        (info as { message?: string }[])?.[0]?.message ??
        (info as string[])?.[0]?.match(/error_description="([^"]+)"/)?.[1];

      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: errorMessage ?? AUTH_MESSAGES.AUTHENTICATION_FAILED,
        }),
      );
    }
    /**
     * set on reqyest and response params
     */
    req.user = user;
    res.locals.user = user;
    next();
  };
};

// WorkOS auth middleware function
const workOSAuth = async (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  const authToken =
    req.headers.authorization?.split("Bearer ")[1] ||
    req.cookies["wos-session"];

  try {
    let session = await authenticateAndGetWorkOSSession(authToken);

    /**
     * If there's no session, try to refresh it
     */
    if (!session) {
      const refreshResult = await refreshWorkOSSession(authToken);
      if (!refreshResult.authenticated || !refreshResult.sealedSession) {
        // Handle failure
        return handleWorkOSAuthFailure(res);
      }
      // Update cookie
      updateWorkOSCookie(res, refreshResult.sealedSession);
      session = await authenticateAndGetWorkOSSession(
        refreshResult.sealedSession,
      );
    }

    await setWorkOSUserContext(res, session!.user);
    return next();
  } catch (e) {
    APP_LOGGER.error(e);
    return handleWorkOSAuthFailure(res);
  }
};

const requireAuth = (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  /**
   * Applies different strategies: for Api-Key and Bearer authorization headers
   */
  if (authHeader && authHeader.startsWith("Api-Key ")) {
    return passport.authenticate(
      ["headerapikey"],
      { session: false },
      handleAuthCallback(req, res, next),
    )(req, res, next);
  } else if (req.cookies && req.cookies["wos-session"]) {
    return workOSAuth(req, res, next);
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    // for now
    return workOSAuth(req, res, next);
  } else {
    return res.status(httpStatus.UNAUTHORIZED).json(
      jsonResponse({
        success: false,
        message: AUTH_MESSAGES.INVALID_CREDENTIALS,
        data: {
          authorizationUrl: env.WORKOS_AUTH_URL,
        },
      }),
    );
  }
};

export { requireAuth };
