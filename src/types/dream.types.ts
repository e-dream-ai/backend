import { CompletedPart } from "@aws-sdk/client-s3";

export type DreamParamsRequest = {
  uuid: string;
};

export type CreateDreamRequest = {
  name: string;
  prompt: string | object;
  description?: string;
  sourceUrl?: string;
  nsfw?: boolean;
  hidden?: boolean;
  ccbyLicense?: boolean;
};

export type Frame = { frameNumber: number; url: string };

export type GetDreamsQuery = {
  status: DreamStatusType;
  take: number;
  skip: number;
  userUUID: string;
};

export type UpdateDreamRequest = {
  name?: string;
  video?: string;
  thumbnail?: string;
  activityLevel?: number;
  featureRank?: number;
  displayedOwner?: number;
  startKeyframe?: string;
  endKeyframe: string;
  nsfw?: boolean;
  hidden?: boolean;
  description?: string;
  prompt?: string;
  sourceUrl?: string;
  ccbyLicense?: boolean;
};

export type UpdateDreamProcessedRequest = {
  processedVideoSize?: number;
  processedVideoFrames?: number;
  processedVideoFPS?: number;
  activityLevel?: number;
  filmstrip?: number[];
  md5?: string;
};

export type CreateMultipartUploadDreamRequest = {
  uuid?: string;
  name: string;
  extension: string;
  parts: number;
  nsfw?: boolean;
  hidden?: boolean;
  description?: string;
  sourceUrl?: string;
  ccbyLicense?: boolean;
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
