import { CompletedPart } from "@aws-sdk/client-s3";

export type GetKeyframeQuery = {
  take?: number;
  skip?: number;
  search?: string;
  userUUID?: string;
};

export type KeyframeParamsRequest = {
  uuid: string;
};

export type CreateKeyframeRequest = {
  name: string;
};

export type UpdateKeyframeRequest = {
  name?: string;
  displayedOwner?: number;
};

export type CreateMultipartUploadFileRequest = {
  extension: string;
};

export type RefreshMultipartUploadUrlRequest = {
  extension: string;
  uploadId: string;
  part: number;
};

export type CompleteMultipartUploadKeyframeRequest = {
  extension: string;
  uploadId: string;
  parts: Array<CompletedPart>;
};
