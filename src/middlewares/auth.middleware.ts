import { NextFunction } from "express";
import httpStatus from "http-status";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import jwksClient, { DecodedToken } from "jwks-rsa";
import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import env from "shared/env";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { fetchUser } from "controllers/auth.controller";
import { APP_LOGGER } from "shared/logger";
import { JwtPayloadType } from "types/auth.types";
import { RequestType, ResponseType } from "types/express.types";
import { getErrorCode, getErrorMessage } from "utils/aws/auth-errors";
import { jsonResponse } from "utils/responses.util";

export const validateToken = async (token: string): Promise<JwtPayloadType> => {
  const jwksUri = `https://cognito-idp.${env.AWS_REGION}.amazonaws.com/${env.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
  const verifyIssuerUri = `https://cognito-idp.${env.AWS_REGION}.amazonaws.com/${env.AWS_COGNITO_USER_POOL_ID}`;

  // Decode the JWT token without verifying to get kid for key lookup
  const decodedToken: DecodedToken = jwt.decode(token, {
    complete: true,
  }) as DecodedToken;

  if (!decodedToken?.header) {
    throw new Error(AUTH_MESSAGES.INVALID_TOKEN);
  }

  const client = jwksClient({
    cache: true,
    jwksUri: jwksUri,
  });

  const signingKey = await client.getSigningKey(decodedToken.header.kid);

  // Verify the token
  return jwt.verify(token, signingKey.getPublicKey(), {
    issuer: verifyIssuerUri,
    algorithms: ["RS256"],
  }) as JwtPayloadType;
};

const authMiddleware = async (
  req: RequestType,
  res: ResponseType,
  next: NextFunction,
) => {
  if (!req.headers.authorization) {
    return next();
  }
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    const validatedToken = await validateToken(accessToken);
    const { username } = validatedToken;
    const user = await fetchUser(username);

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json(
        jsonResponse({
          success: false,
          message: AUTH_MESSAGES.USER_NOT_FOUND,
        }),
      );
    }

    res.locals.user = user;
    res.locals.accessToken = accessToken;
  } catch (error) {
    APP_LOGGER.error(error);
    const jwtError = error as JsonWebTokenError;
    const message: string = getErrorMessage(jwtError.name);
    const code: number = getErrorCode(jwtError.name);

    return res.status(code).json(jsonResponse({ success: false, message }));
  }

  next();
};

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

export default authMiddleware;
