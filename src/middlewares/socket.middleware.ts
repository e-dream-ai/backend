import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import { fetchUser } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { validateToken } from "middlewares/auth.middleware";

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void,
) => {
  console.info("Connection attempt has begun");
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
    const validatedToken = await validateToken(String(accessToken));
    const { username } = validatedToken;
    const user = await fetchUser(username);
    socket.data.user = user;
    if (validatedToken) {
      return next();
    }
    return next(new Error("Authentication error"));
  } catch (error) {
    console.error("Connection attempt failed: not authorized connection");
    APP_LOGGER.error(error);
  }
};
