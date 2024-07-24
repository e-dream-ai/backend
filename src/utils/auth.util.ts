import jwt from "jsonwebtoken";
import jwksClient, { DecodedToken } from "jwks-rsa";
import env from "shared/env";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { JwtPayloadType } from "types/auth.types";

export const validateCognitoJWT = async (
  token: string,
): Promise<JwtPayloadType> => {
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

export const validateApiKey = async (apiKey: string) => {
  const apiKeys: { userId: number; apiKey: string }[] = env.API_KEYS;
  if (!apiKeys) {
    return undefined;
  }
  if (!Array.isArray(apiKeys)) {
    return undefined;
  }

  const validApiKey = apiKeys.find((ak) => ak.apiKey === apiKey);

  if (validApiKey) {
    return validApiKey.userId;
  } else {
    return undefined;
  }
};
