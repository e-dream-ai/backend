import { CompletedPart } from "@aws-sdk/client-s3";

export type CreateDreamRequest = object;

export type GetDreamsQuery = {
  status: DreamStatusType;
  take: number;
  skip: number;
  userId: number;
};

export type UpdateDreamRequest = {
  name?: string;
  video?: string;
  thumbnail?: string;
  activityLevel?: number;
  featureRank?: number;
  displayedOwner?: number;
};

export type UpdateDreamProcessedRequest = {
  processedVideoSize?: number;
  processedVideoFrames?: number;
  processedVideoFPS?: number;
};

export type CreatePresignedDreamRequest = {
  name: string;
  extension: string;
};

export type ConfirmDreamRequest = {
  name: string;
  extension: string;
};

export type CreateMultipartUploadDreamRequest = {
  uuid?: string;
  name: string;
  extension: string;
  parts: number;
};

export type RefreshMultipartUploadUrlRequest = {
  extension: string;
  uploadId: string;
  part: number;
};

export type CompleteMultipartUploadDreamRequest = {
  name: string;
  extension: string;
  uploadId: string;
  parts: Array<CompletedPart>;
};

export type AbortMultipartUploadDreamRequest = {
  extension: string;
  uploadId: string;
};

export enum DreamStatusType {
  NONE = "none",
  QUEUE = "queue",
  PROCESSING = "processing",
  FAILED = "failed",
  PROCESSED = "processed",
}
