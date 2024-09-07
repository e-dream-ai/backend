import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { NextFunction } from "express";
import httpStatus from "http-status";
import passport from "passport";
import { RequestType, ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";
import { AuthenticateWithSessionCookieFailureReason } from "@workos-inc/node";
import { workos } from "utils/auth.util";

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
const workOSAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization?.split("Wos-Api-Key ")[1];
  const authToken = authHeader || req.cookies["wos-session"];

  const authenticationResponse =
    await workos.userManagement.authenticateWithSessionCookie({
      sessionData: authToken,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
    });

  const { authenticated, reason } = authenticationResponse;

  // console.log('workOSAuth middle', authenticated, reason);
  if (authenticated) {
    const session = await workos.userManagement.getSessionFromCookie({
      sessionData: authToken,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
    });

    const organizationMemberships =
      await workos.userManagement.listOrganizationMemberships({
        userId: session.user.id,
      });

    // construct user object compatible with v1 role management
    const user = {
      ...session.user,
      role: {
        name: organizationMemberships.data[0]?.role.slug,
      },
    };

    // console.log(`User ${JSON.stringify(user)} is logged in and belongs to groups ${JSON.stringify(organizationMemberships)}`);
    res.user = user;
    res.locals.user = user;

    return next();
  }

  try {
    // If the session is invalid (i.e. the access token has expired)
    // attempt to re-authenticate with the refresh token
    const refreshResponse =
      await workos.userManagement.refreshAndSealSessionData({
        sessionData: authToken,
        cookiePassword: process.env.WORKOS_COOKIE_PASSWORD,
      });

    if (!refreshResponse.authenticated) {
      return res.status(httpStatus.UNAUTHORIZED).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
          authorizationUrl: process.env.WORKOS_AUTH_URL,
        }),
      );
    }

    // Update the cookie
    res.cookie("wos-session", refreshResponse.sealedSession, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    return next();
  } catch (e) {
    // Failed to refresh access token, redirect user to login page
    // after deleting the cookie
    res.clearCookie("wos-session");
    return res.status(httpStatus.UNAUTHORIZED).json(
      jsonResponse({
        success: false,
        message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
        authorizationUrl: process.env.WORKOS_AUTH_URL,
      }),
    );
  }

  // If no session, redirect the user to the login page
  if (
    !authenticated &&
    reason ===
      AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED
  ) {
    return res.status(httpStatus.UNAUTHORIZED).json(
      jsonResponse({
        success: false,
        message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
        authorizationUrl: process.env.WORKOS_AUTH_URL,
      }),
    );
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
  if (authHeader && authHeader.startsWith("Bearer ")) {
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
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: AUTH_MESSAGES.INVALID_CREDENTIALS,
      authorizationUrl: process.env.WORKOS_AUTH_URL,
    });
  }
};

export { requireAuth };
