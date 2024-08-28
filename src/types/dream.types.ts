import { CompletedPart } from "@aws-sdk/client-s3";

export type DreamParamsRequest = {
  uuid: string;
};

export type CreateDreamRequest = object;

export type Frame = { frameNumber: number; url: string };

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
  activityLevel?: number;
  filmstrip?: number[];
};

export type CreateMultipartUploadDreamRequest = {
  uuid?: string;
  name: string;
  extension: string;
  parts: number;
  nsfw?: boolean;
};

export type CreateMultipartUploadFileRequest = {
  type: DreamFileType;
  extension: string;
  parts: number;
  frameNumber?: number;
  processed?: boolean;
};

export type RefreshMultipartUploadUrlRequest = {
  type: DreamFileType;
  extension: string;
  uploadId: string;
  part: number;
  frameNumber?: number;
  processed?: boolean;
};

export type CompleteMultipartUploadDreamRequest = {
  type: DreamFileType;
  name: string;
  extension: string;
  uploadId: string;
  parts: Array<CompletedPart>;
  frameNumber?: number;
  processed?: boolean;
};

export type AbortMultipartUploadDreamRequest = {
  extension: string;
  uploadId: string;
};

export enum DreamFileType {
  THUMBNAIL = "thumbnail",
  FILMSTRIP = "filmstrip",
  DREAM = "dream",
}

export enum DreamStatusType {
  NONE = "none",
  QUEUE = "queue",
  PROCESSING = "processing",
  FAILED = "failed",
  PROCESSED = "processed",
}
