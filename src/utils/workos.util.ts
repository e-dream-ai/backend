import { ResponseType } from "types/express.types";
import { WorkOS } from "@workos-inc/node";
import env from "shared/env";
import { CookieOptions } from "express";
import { syncWorkOSUser } from "./user.util";
import { jsonResponse } from "./responses.util";
import httpStatus from "http-status";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import type { User as WorkOSUser } from "@workos-inc/node";

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
  domain: IS_DEVELOPMENT ? "localhost" : env.BACKEND_DOMAIN,
  path: "/",
  httpOnly: true,
  secure: !IS_DEVELOPMENT,
  sameSite: "lax",
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

/**
 * Refreshes an expired WorkOS session
 * @param authToken - Expired authentication token
 * @returns Refresh response containing a new sealed session if successful
 */
export const refreshWorkOSSession = async (authToken: string) => {
  const refreshResponse = await workos.userManagement.refreshAndSealSessionData(
    {
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    },
  );
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
  const user = await syncWorkOSUser(workOSUser, workOSRole);

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
