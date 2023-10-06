import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import env from "shared/env";

export const AWS_COGNITO_APP_CLIENT_ID = env.AWS_COGNITO_APP_CLIENT_ID;
export const AWS_COGNITO_USER_POOL_ID = env.AWS_COGNITO_USER_POOL_ID;

export const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
