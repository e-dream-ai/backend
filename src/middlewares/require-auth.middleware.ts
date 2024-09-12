import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { NextFunction } from "express";
import httpStatus from "http-status";
import passport from "passport";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import { workos, workOSCookieConfig } from "utils/auth.util";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { syncWorkOSUser } from "utils/user.util";

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
  const authHeader = req.headers.authorization?.split("Bearer ")[1];
  const authToken = authHeader || req.cookies["wos-session"];

  const authenticationResponse =
    await workos.userManagement.authenticateWithSessionCookie({
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

  const {
    // reason,
    authenticated,
  } = authenticationResponse;

  // console.log("workOSAuth authenticated:", authenticated, reason);
  if (authenticated) {
    const session = await workos.userManagement.getSessionFromCookie({
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    if (!session) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
          data: {
            authorizationUrl: env.WORKOS_AUTH_URL,
          },
        }),
      );
    }

    const organizationMemberships =
      await workos.userManagement.listOrganizationMemberships({
        userId: session.user.id,
      });

    // console.log(`User ${JSON.stringify(user)} is logged in and belongs to groups ${JSON.stringify(organizationMemberships)}`);
    const workOSUser = session.user;
    const workOSRole = organizationMemberships.data[0]?.role.slug;
    const user = await syncWorkOSUser(session.user, workOSRole);
    res.locals.workosUser = workOSUser;
    res.locals.userRole = workOSRole;
    res.locals.user = user;

    return next();
  }

  try {
    // If the session is invalid (i.e. the access token has expired)
    // attempt to re-authenticate with the refresh token
    const refreshResponse =
      await workos.userManagement.refreshAndSealSessionData({
        sessionData: authToken,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      });

    if (!refreshResponse.authenticated) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
          data: {
            authorizationUrl: env.WORKOS_AUTH_URL,
          },
        }),
      );
    }

    // Update the cookie
    res.cookie(
      "wos-session",
      refreshResponse.sealedSession,
      workOSCookieConfig,
    );

    return next();
  } catch (e) {
    APP_LOGGER.error(e);
    // Failed to refresh access token, redirect user to login page
    // after deleting the cookie
    res.clearCookie("wos-session");
    return res.status(httpStatus.UNAUTHORIZED).json(
      jsonResponse({
        success: false,
        message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
        data: {
          authorizationUrl: env.WORKOS_AUTH_URL,
        },
      }),
    );
  }

  // This code is inaccesible
  // If no session, redirect the user to the login page
  // if (
  //   !authenticated &&
  //   reason ===
  //     AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED
  // ) {
  //   return res.status(httpStatus.UNAUTHORIZED).json(
  //     jsonResponse({
  //       success: false,
  //       message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
  //       data: {
  //         authorizationUrl: env.WORKOS_AUTH_URL,
  //       },
  //     }),
  //   );
  // }
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
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // return workOSAuth(req, res, next);
    return passport.authenticate(
      ["bearer"],
      { session: false },
      handleAuthCallback(req, res, next),
    )(req, res, next);
  } else if (authHeader && authHeader.startsWith("Api-Key ")) {
    return passport.authenticate(
      ["headerapikey"],
      { session: false },
      handleAuthCallback(req, res, next),
    )(req, res, next);
  } else if (req.cookies && req.cookies["wos-session"]) {
    return workOSAuth(req, res, next);
  } else if (authHeader && authHeader.startsWith("Wos-Api-Key")) {
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
