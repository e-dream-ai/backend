export type CreateDreamRequest = object;

export type UpdateDreamRequest = {
  name?: string;
  video?: string;
  thumbnail?: string;
  activityLevel?: number;
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
  name: string;
  extension: string;
  parts: number;
};

export type CompleteMultipartUploadDreamRequest = {
  name: string;
  extension: string;
  uploadId: string;
  parts: number;
};

export enum DreamStatusType {
  NONE = "none",
  QUEUE = "queue",
  PROCESSING = "processing",
  FAILED = "failed",
  PROCESSED = "processed",
}
