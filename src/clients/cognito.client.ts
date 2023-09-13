import env from "shared/env";

import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export const AWS_COGNITO_APP_CLIENT_ID = env.AWS_COGNITO_APP_CLIENT_ID;

export const cognitoIdentityProviderClient = new CognitoIdentityProviderClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const cognitoIdentityClient = new CognitoIdentityClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
