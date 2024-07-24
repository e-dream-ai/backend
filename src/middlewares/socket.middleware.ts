import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUserByCognitoId } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateCognitoJWT } from "utils/auth.util";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  APP_LOGGER.info("Socket connection attempt has begun");

  try {
    const token = socket.handshake.query.token;
    /**
     * If is not string or empty throw error
     */
    if (typeof token !== "string" || !token) {
      return next(new Error("Authentication error"));
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
    return next(new Error("Authentication error"));
  } catch (error) {
    APP_LOGGER.error(
      "Socket connection attempt failed: not authorized connection",
      error,
    );
  }
};
