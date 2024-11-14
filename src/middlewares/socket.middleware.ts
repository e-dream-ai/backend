import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateCognitoJWT } from "utils/auth.util";
import {
  authenticateAndGetWorkOSSession,
  refreshWorkOSSession,
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
    let session = await authenticateAndGetWorkOSSession(authToken);

    if (!session) {
      const refreshResult = await refreshWorkOSSession(authToken);
      if (!refreshResult.authenticated || !refreshResult.sealedSession) {
        // Handle failure
        return next(authError);
      }
      // Update cookie
      // updateWorkOSCookie(res, refreshResult.sealedSession);

      // Update cookie on req object to have refreshed sealed session to handle on logout
      // req.cookies["wos-session"] = refreshResult.sealedSession;

      session = await authenticateAndGetWorkOSSession(
        refreshResult.sealedSession,
      );
    }

    const workOSUser = session!.user;
    const user = await syncWorkOSUser(workOSUser);
    socket.data.user = user;

    /**
     * continue if user exists
     */
    if (socket.data.user) {
      return next();
    } else {
      return next(authError);
    }
  } catch (e) {
    APP_LOGGER.error(e);
  }
};
