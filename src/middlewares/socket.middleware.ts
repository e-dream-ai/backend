import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUser } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateToken } from "middlewares/auth.middleware";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  APP_LOGGER.info("Socket connection attempt has begun");

  try {
    const accessToken = socket.handshake.headers?.authorization?.split(" ")[1];

    /**
     * If is not string or empty throw error
     */
    if (typeof accessToken !== "string" || !accessToken) {
      return next(new Error("Authentication error"));
    }

    // Validate the token
    const validatedToken = await validateToken(String(accessToken));
    const { username } = validatedToken;
    const user = await fetchUser(username);
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
