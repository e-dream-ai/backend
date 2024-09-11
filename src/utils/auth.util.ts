import jwt from "jsonwebtoken";
import jwksClient, { DecodedToken } from "jwks-rsa";
import env from "shared/env";
import { AUTH_MESSAGES } from "constants/messages/auth.constant";
import { JwtPayloadType } from "types/auth.types";
import { ApiKey } from "entities";
import appDataSource from "database/app-data-source";
import { hashApiKey } from "./crypto.util";
import { WorkOS } from "@workos-inc/node";

const apiKeyRepository = appDataSource.getRepository(ApiKey);

export const workos = new WorkOS(env.WORKOS_API_KEY, {
  clientId: env.WORKOS_CLIENT_ID,
});

export const workOSCookieConfig = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: env.WORKOS_CALLBACK_URL.indexOf("https:") === 0,
};

/**
 * Validates cognito jwt
 * @param token
 * @returns {JwtPayloadType} jwtPayload
 */
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

/**
 * Validates apikey
 * @param apiKey
 * @returns {number | undefined} userId
 */
export const validateApiKey = async (apiKey: string) => {
  /**
   * search for API_KEYS on ENV file values
   */

  /**
   * now api keys are obteined from ENV with API_KEYS in this format:
   *
   * { userId: number; apiKey: string }
   *
   * will be changed on future for storing on sql or other strategy
   */
  const apiKeys: { userId: number; apiKey: string }[] = env.API_KEYS;

  const validApiKey = apiKeys?.find((ak) => ak?.apiKey === apiKey);

  if (validApiKey) {
    return validApiKey.userId;
  }

  /**
   * search for API_KEYS on database
   */

  const hashedKey = hashApiKey(apiKey);

  const dbApiKey = await apiKeyRepository.findOne({
    where: {
      hash: hashedKey,
    },
    /**
     * add user relation to obtain user id
     */
    relations: { user: true },
  });

  if (dbApiKey) {
    return dbApiKey?.user.id;
  }

  return undefined;
};
