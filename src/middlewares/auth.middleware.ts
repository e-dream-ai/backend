import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient, { DecodedToken } from "jwks-rsa";
import env from "shared/env";
import { RequestType } from "types/express.types";

const validateToken = async (token: string): Promise<object> => {
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
  });
};

const authMiddleware = async (
  request: RequestType,
  response: Response,
  next: NextFunction,
) => {
  if (!request.headers.authorization) {
    return next();
  }
  try {
    const tokenBearer = request.headers.authorization.split(" ")[1];

    const resultValidation = await validateToken(tokenBearer);

    console.log({ resultValidation });

    response.locals.user = 2;

    //resultValidation returns current user data (as a token we should use IdToken to get all of the details about the user)
    // request.user = {
    //   id: resultValidation.sub,
    //   name: resultValidation.name,
    //   email: resultValidation.email,
    //   roles: resultValidation["cognito:groups"],
    // };
  } catch (error) {
    throw new Error(AUTH_MESSAGES.INVALID_TOKEN);
  }

  next();
};

export default authMiddleware;
