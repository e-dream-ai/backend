import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateCognitoJWT } from "utils/auth.util";
import { SOCKET_AUTH_ERROR_MESSAGES } from "constants/messages/auth.constant";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  APP_LOGGER.info("Socket connection attempt has begun");

  /**
   * setup auth error
   */
  const authError: ExtendedError = {
    name: SOCKET_AUTH_ERROR_MESSAGES.UNAUTHORIZED,
    message: SOCKET_AUTH_ERROR_MESSAGES.UNAUTHORIZED,
  };

  try {
    const token = socket.handshake.query.token;
    /**
     * If is not string or empty throw error
     */
    if (typeof token !== "string" || !token) {
      return next(authError);
    }
    const accessToken = String(token)?.split(" ")[1];
    // Validate the token
    const validatedToken = await validateCognitoJWT(String(accessToken));
    const { username: cognitoId } = validatedToken;
    const user = await fetchUserByCognitoId(cognitoId);
    socket.data.user = user;
    if (validatedToken) {
      return next();
    }
    return next(authError);
  } catch (error) {
    APP_LOGGER.error(
      "Socket connection attempt failed: not authorized connection",
      error,
    );

    return next(authError);
  }
};
