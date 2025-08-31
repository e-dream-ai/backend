import {
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { r2Client } from "clients/r2.client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import env from "shared/env";
import { EXPIRATION_TIME } from "constants/cloudflare/r2.constants";

const BUCKET_NAME = env.R2_BUCKET_NAME;

const PROCESSED_VIDEO_SUFFIX = "processed";

/**
 *
 * @param {string} objectKey - object key on R2
 * @returns {string} signed url to upload file
 */
export const generateSignedUrl = async (objectKey: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });

  const url = await getSignedUrl(r2Client, command, {
    expiresIn: EXPIRATION_TIME,
  });
  return url;
};

/**
 *
 * @param {string} objectKey - object key on R2
 * @returns {string} ID for the initiated multipart upload
 */
export const createMultipartUpload = async (objectKey: string) => {
  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });

  const response = await r2Client.send(command);
  const uploadId = response.UploadId;
  return uploadId;
};

/**
 * Generates signed url for a upload part
 * @param {string} objectKey - object key on R2
 * @param {string} uploadId - multipart upload id
 * @param {number} partNumber - upload part number
 * @returns {string} ID for the initiated multipart upload
 */
export const getUploadPartSignedUrl = async (
  objectKey: string,
  uploadId: string,
  partNumber: number,
) => {
  const command = new UploadPartCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  // Use getSignedUrl method from R2Client to generate the pre-signed URL
  const url = await getSignedUrl(r2Client, command, {
    expiresIn: EXPIRATION_TIME,
  });

  return url;
};

/**
 *
 * @param {string} objectKey - object key on R2
 * @param {string} uploadId - multipart upload id
 * @param {number} parts - completed parts CompletedPart[],
 * @returns {string} ID for the initiated multipart upload
 */
export const completeMultipartUpload = async (
  objectKey: string,
  uploadId: string,
  parts: CompletedPart[],
) => {
  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  });

  const response = await r2Client.send(command);
  return response;
};

/**
 *
 * @param {string} objectKey - object key on R2
 * @param {string} uploadId - multipart upload id
 * @returns {string} ID for the initiated multipart upload
 */
export const abortMultipartUpload = async (
  objectKey: string,
  uploadId: string,
) => {
  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    UploadId: uploadId,
  });

  const response = await r2Client.send(command);
  return response;
};

/**
 *
 * @param {string} objectKey - object key on R2
 * @returns {string} presigned post url to upload file
 */
export const generatePresignedPost = async (objectKey: string) => {
  const MIN_UPLOAD_SIZE = 1024 * 1024 * 5;
  const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024 * 50;

  const { url, fields } = await createPresignedPost(r2Client, {
    Bucket: BUCKET_NAME,
    Key: objectKey,
    Conditions: [["content-length-range", MIN_UPLOAD_SIZE, MAX_UPLOAD_SIZE]],
    Fields: {
      key: objectKey,
    },
    Expires: EXPIRATION_TIME, //Seconds before the presigned post expires. 3600 by default.
  });

  return { url, fields };
};

export const generateThumbnailPath = ({
  userIdentifier,
  dreamUUID,
  extension,
}: {
  userIdentifier: string;
  dreamUUID: string;
  extension: string;
}) => `${userIdentifier}/${dreamUUID}/thumbnails/${dreamUUID}.${extension}`;

export const generateFilmstripPath = ({
  userIdentifier,
  dreamUUID,
  extension,
  frameNumber,
}: {
  userIdentifier: string;
  dreamUUID: string;
  extension: string;
  frameNumber: number;
}) =>
  `${userIdentifier}/${dreamUUID}/filmstrip/frame-${frameNumber}.${extension}`;

export const generateDreamPath = ({
  userIdentifier,
  dreamUUID,
  extension,
  processed,
}: {
  userIdentifier: string;
  dreamUUID: string;
  extension: string;
  processed?: boolean;
}) =>
  `${userIdentifier}/${dreamUUID}/${dreamUUID}${
    processed ? `_${PROCESSED_VIDEO_SUFFIX}` : ""
  }.${extension}`;

export const generateKeyframePath = ({
  userIdentifier,
  keyframeUUID,
  extension,
}: {
  userIdentifier: string;
  keyframeUUID: string;
  extension: string;
}) =>
  `${userIdentifier}/keyframes/${keyframeUUID}/${keyframeUUID}.${extension}`;
