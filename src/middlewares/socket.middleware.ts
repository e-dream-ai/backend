import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateCognitoJWT } from "utils/auth.util";
import {
  authenticateAndGetWorkOSSession,
  syncDbUserToWorkOS,
} from "utils/workos.util";
import { SOCKET_AUTH_ERROR_MESSAGES } from "constants/messages/auth.constant";
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
  const authToken =
    socket.handshake.headers?.authorization?.split("Bearer ")[1] ||
    socket.cookies["wos-session"];

  try {
    const session = await authenticateAndGetWorkOSSession(authToken);

    if (!session) {
      return next(authError);
    }

    const user = await syncWorkOSUser(session!.user);
    socket.data.user = user;

    // Reconcile DB -> WorkOS (push local changes if any)
    await syncDbUserToWorkOS(user, session!.user);

    /**
     * continue if user exists
     */
    if (user) {
      return next();
    } else {
      return next(authError);
    }
  } catch (e) {
    APP_LOGGER.error(e);
    return next(authError);
  }
};
