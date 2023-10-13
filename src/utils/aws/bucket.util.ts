import env from "shared/env";

export const generateBucketObjectURL = (path: string) =>
  `${env.AWS_BUCKET_URL}/${path}`;
