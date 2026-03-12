import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { NextFunction } from "express";
import httpStatus from "http-status";
import passport from "passport";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import {
  handleWorkOSAuthFailure,
  authenticateWorkOS,
  setWorkOSUserContext,
  updateWorkOSCookie,
} from "utils/workos.util";
import { GenericServerException } from "@workos-inc/node";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { isAuthFailureSimulated } from "utils/simulate-auth-failure.util";

const AUTH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Auth operation timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer!));
}

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
  if (isAuthFailureSimulated()) {
    APP_LOGGER.warn("Simulated auth failure triggered (workOSAuth)");
    return res.status(503).json(
      jsonResponse({
        success: false,
        message: "Authentication service temporarily unavailable",
      }),
    );
  }

  const authToken =
    req.headers.authorization?.split("Bearer ")[1] ||
    req.cookies["wos-session"];

  try {
    const result = await withTimeout(
      authenticateWorkOS(authToken),
      AUTH_TIMEOUT_MS,
    );

    // Handle no result
    if (!result) {
      return handleWorkOSAuthFailure(res);
    }

    // Update cookie on request and response when session is refreshed
    if (result.sealedSession) {
      updateWorkOSCookie(res, result.sealedSession);
      req.cookies["wos-session"] = result.sealedSession;
    }

    await withTimeout(
      setWorkOSUserContext(res, result.session.user),
      AUTH_TIMEOUT_MS,
    );
    return next();
  } catch (e) {
    APP_LOGGER.error("workOSAuth error", e);

    // Transient errors: return 503 without clearing the cookie
    const err = e as Error;
    if (
      e instanceof GenericServerException ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("ETIMEDOUT") ||
      err.message?.includes("timed out")
    ) {
      return res.status(503).json(
        jsonResponse({
          success: false,
          message: "Authentication service temporarily unavailable",
        }),
      );
    }

    return next(e);
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
