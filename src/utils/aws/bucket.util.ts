import env from "shared/env";

export const completeMediaUrl = (path: string) =>
  `${env.AWS_BUCKET_URL}/${path}`;
