import env from "shared/env";

export const generateBucketObjectURL = (path: string) =>
  `${env.R2_BUCKET_URL}/${path}`;
