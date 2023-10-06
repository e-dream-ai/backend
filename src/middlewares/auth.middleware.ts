import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { fetchAwsUser } from "controllers/auth.controller";
import { NextFunction } from "express";
import httpStatus from "http-status";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import jwksClient, { DecodedToken } from "jwks-rsa";
import env from "shared/env";
import { JwtPayloadType } from "types/auth.types";
import { RequestType, ResponseType } from "types/express.types";
import { getErrorMessage } from "utils/aws/auth-errors";
import { jsonResponse } from "utils/responses.util";

const validateToken = async (token: string): Promise<JwtPayloadType> => {
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
    await validateToken(accessToken);
    const user = await fetchAwsUser(accessToken);
    res.locals.user = user;
    res.locals.accessToken = accessToken;
  } catch (error) {
    const jwtError = error as JsonWebTokenError;
    const message: string = getErrorMessage(jwtError.name);

    return res
      .status(httpStatus.BAD_REQUEST)
      .json(jsonResponse({ success: false, message }));
  }

  next();
};

export default authMiddleware;
