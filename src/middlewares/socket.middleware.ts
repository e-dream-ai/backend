import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateCognitoJWT } from "utils/auth.util";
import { workos } from "utils/workos.util";
import { SOCKET_AUTH_ERROR_MESSAGES } from "constants/messages/auth.constant";
import env from "shared/env";
import { syncWorkOSUser } from "utils/user.util";

/**
 * Setup auth error
 */
const authError: ExtendedError = {
  name: SOCKET_AUTH_ERROR_MESSAGES.UNAUTHORIZED,
  message: SOCKET_AUTH_ERROR_MESSAGES.UNAUTHORIZED,
};

export const socketCookieParserMiddleware = (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  const cookieString = socket.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    socket.cookies = cookies;
  } else {
    socket.cookies = {};
  }
  next();
};

// Helper function to parse cookies
function parseCookies(cookieString: string) {
  const cookies: {
    [key: string]: string;
  } = {};

  cookieString.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0].trim();
    const value = parts[1] ? parts[1].trim() : "";
    cookies[name] = value;
  });
  return cookies;
}

/**
 * @deprecated will be deprecated after changing cognito to workos
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  const token = socket.handshake.query?.token;
  try {
    /**
     * If token exists try to validate it, else continue with workos auth middleware
     */
    if (token && typeof token === "string") {
      const accessToken = String(token)?.split(" ")[1];
      // Validate the token
      const validatedToken = await validateCognitoJWT(String(accessToken));
      const { username: cognitoId } = validatedToken;
      const user = await fetchUserByCognitoId(cognitoId);
      socket.data.user = user;

      if (validatedToken) {
        return next();
      } else {
        return next(authError);
      }
    }

    /**
     * continue with flow
     * user can be logged in with workos, and will be validated on `socketWorkOSAuth`
     * delete this middleware after deprecating cognito
     */
    return next();
  } catch (error) {
    APP_LOGGER.error(
      "Socket connection attempt failed: not authorized connection",
      error,
    );

    return next(authError);
  }
};

// WorkOS auth middleware function
export const socketWorkOSAuth = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  const authHeader =
    socket.handshake.headers?.authorization?.split("Bearer ")[1];

  const authToken = authHeader || socket.cookies["wos-session"];

  const authenticationResponse =
    await workos.userManagement.authenticateWithSessionCookie({
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

  const {
    // reason,
    authenticated,
  } = authenticationResponse;

  if (authenticated) {
    const session = await workos.userManagement.getSessionFromCookie({
      sessionData: authToken,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    if (!session) {
      return next(authError);
    }

    const organizationMemberships =
      await workos.userManagement.listOrganizationMemberships({
        userId: session.user.id,
      });

    const workOSUser = session.user;
    const workOSRole = organizationMemberships.data[0]?.role.slug;
    const user = await syncWorkOSUser(workOSUser, workOSRole);
    socket.data.user = user;

    return next();
  }

  /**
   * continue if user exists
   */
  if (socket.data.user) {
    return next();
  } else {
    return next(authError);
  }
};
