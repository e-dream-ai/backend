import { SESClient } from "@aws-sdk/client-ses";

import env from "shared/env";

export const sesClient: SESClient = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
