import { ResponseType } from "types/express.types";
import { WorkOS } from "@workos-inc/node";
import env from "shared/env";
import { CookieOptions } from "express";
import { syncWorkOSUser } from "./user.util";
import { jsonResponse } from "./responses.util";
import httpStatus from "http-status";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import type { SessionCookieData, User as WorkOSUser } from "@workos-inc/node";
import { APP_LOGGER } from "shared/logger";

const IS_DEVELOPMENT = env.NODE_ENV === "development";

/**
 * WorkOS client
 */
export const workos = new WorkOS(env.WORKOS_API_KEY, {
  clientId: env.WORKOS_CLIENT_ID,
});

/**
 * Configuration for the WorkOS session cookie
 */
export const workOSCookieConfig: CookieOptions = {
  httpOnly: true,
  secure: !IS_DEVELOPMENT,
  sameSite: "lax",
  // 365 days in ms (same config as in workos configuration for authentication panel)
  maxAge: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Authenticates a user with WorkOS and retrieves their session
 * @param authToken - Authentication token from the request
 * @returns WorkOS session if authenticated, null otherwise
 */
export const authenticateAndGetWorkOSSession = async (authToken: string) => {
  const { authenticated } =
    await workos.userManagement.authenticateWithSessionCookie({
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

  if (!authenticated) return null;

  return workos.userManagement.getSessionFromCookie({
    sessionData: authToken,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
};

// Common authentication logic
export const authenticateWorkOS = async (
  authToken: string | undefined,
): Promise<{
  session: SessionCookieData;
  sealedSession?: string;
} | null> => {
  if (!authToken) {
    return null;
  }

  try {
    let session = await authenticateAndGetWorkOSSession(authToken);

    if (!session) {
      const refreshResult = await refreshWorkOSSession(authToken);
      if (!refreshResult.authenticated || !refreshResult.sealedSession) {
        return null;
      }

      session = await authenticateAndGetWorkOSSession(
        refreshResult.sealedSession,
      );

      return session
        ? { session, sealedSession: refreshResult.sealedSession }
        : null;
    }

    return {
      session,
    };
  } catch (e) {
    APP_LOGGER.error(e);
    return null;
  }
};

/**
 * Refreshes an expired WorkOS session
 * @param authToken - Expired authentication token
 * @returns Refresh response containing a new sealed session if successful
 */
export const refreshWorkOSSession = async (authToken: string) => {
  const session = await workos.userManagement.loadSealedSession({
    sessionData: authToken,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
  const refreshResponse = await session.refresh();

  return refreshResponse;
};

/**
 * Sets the WorkOS user context in the response locals
 * Also syncs the WorkOS user with the local user database
 * @param res - Response object
 * @param workOSUser - Authenticated WorkOS user
 */
export const setWorkOSUserContext = async (
  res: ResponseType,
  workOSUser: WorkOSUser,
) => {
  const organizationMemberships =
    await workos.userManagement.listOrganizationMemberships({
      userId: workOSUser.id,
    });
  const workOSRole = organizationMemberships.data[0]?.role.slug;
  const user = await syncWorkOSUser(workOSUser);

  res.locals.workosUser = workOSUser;
  res.locals.userRole = workOSRole;
  res.locals.user = user;
};

/**
 * Updates the WorkOS session cookie in the response
 * @param res - Response object
 * @param sealedSession - New sealed session data
 */
export const updateWorkOSCookie = (
  res: ResponseType,
  sealedSession: string,
) => {
  res.cookie("wos-session", sealedSession, workOSCookieConfig);
};

/**
 * Handles authentication failure by clearing the session cookie and returning an unauthorized response
 * @param res - Response object
 * @returns An unauthorized response with authentication failure message
 */
export const handleWorkOSAuthFailure = (res: ResponseType) => {
  res.clearCookie("wos-session", workOSCookieConfig);
  return res.status(httpStatus.UNAUTHORIZED).json(
    jsonResponse({
      success: false,
      message: AUTH_MESSAGES.AUTHENTICATION_FAILED,
      data: { authorizationUrl: env.WORKOS_AUTH_URL },
    }),
  );
};
