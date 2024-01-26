import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "clients/s3.client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import env from "shared/env";
import { BUCKET_ACL } from "constants/aws/s3.constants";

/**
 *
 * @param {string} objectKey - object key on s3
 * @returns {string} signed url to upload file
 */
export const generateSignedUrl = async (objectKey: string) => {
  const bucketName = env.AWS_BUCKET_NAME;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  // @ts-expect-error client works fine, is a type error compatibility with aws packages
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
  return url;
};

/**
 *
 * @param {string} objectKey - object key on s3
 * @returns {string} presigned post url to upload file
 */
export const generatePresignedPost = async (objectKey: string) => {
  const bucketName = env.AWS_BUCKET_NAME;

  // @ts-expect-error client works fine, is a type error compatibility with aws packages
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: bucketName,
    Key: objectKey,
    Conditions: [
      ["eq", "$acl", BUCKET_ACL], // acl condition
    ],
    Fields: {
      key: objectKey,
      acl: BUCKET_ACL, // field acl contidion
    },
    Expires: 3600, //Seconds before the presigned post expires. 3600 by default.
  });

  console.log({ url, fields });

  return { url, fields };
};
