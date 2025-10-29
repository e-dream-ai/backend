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
import { User } from "entities";

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
  sameSite: "lax" as const,
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
    const error = e as Error;
    console.error(error);
    APP_LOGGER.error(error);
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
 * Pushes local DB user changes back to WorkOS to keep data in sync.
 * It updates basic profile fields and organization membership role.
 */
export const syncDbUserToWorkOS = async (
  dbUser: User,
  workOSUser?: WorkOSUser,
) => {
  try {
    const userId = dbUser.workOSId || workOSUser?.id;
    if (!userId) return;

    const desiredFirstName = dbUser.name ?? undefined;
    const desiredLastName = dbUser.lastName ?? undefined;
    const desiredEmail = dbUser.email ?? undefined;

    const pendingUpdates: Record<string, string> = {};

    if (
      desiredFirstName !== undefined &&
      desiredFirstName !== (workOSUser?.firstName ?? "")
    ) {
      pendingUpdates.firstName = desiredFirstName;
    }
    if (
      desiredLastName !== undefined &&
      desiredLastName !== (workOSUser?.lastName ?? "")
    ) {
      pendingUpdates.lastName = desiredLastName;
    }
    if (
      desiredEmail !== undefined &&
      desiredEmail !== (workOSUser?.email ?? "")
    ) {
      pendingUpdates.email = desiredEmail;
    }

    if (Object.keys(pendingUpdates).length > 0) {
      await workos.userManagement.updateUser({
        userId,
        ...pendingUpdates,
      });
    }

    // Ensure org membership role matches local role
    if (dbUser.role?.name && env.WORKOS_ORGANIZATION_ID) {
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId,
        });
      const membership = memberships.data.find(
        (m) => m.organizationId === env.WORKOS_ORGANIZATION_ID,
      );

      if (!membership) {
        await workos.userManagement.createOrganizationMembership({
          userId,
          organizationId: env.WORKOS_ORGANIZATION_ID,
          roleSlug: dbUser.role.name,
        });
      } else if (membership.role.slug !== dbUser.role.name) {
        await workos.userManagement.updateOrganizationMembership(
          membership.id,
          { roleSlug: dbUser.role.name },
        );
      }
    }
  } catch (e) {
    const error = e as Error;
    APP_LOGGER.error(error);
  }
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
