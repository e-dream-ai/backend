export type CreateDreamRequest = object;

export type UpdateDreamRequest = {
  name?: string;
  video?: string;
  thumbnail?: string;
  activityLevel?: number;
};

export type ConfirmDreamRequest = {
  name: string;
  extension: string;
};

export type CreatePresignedDreamRequest = {
  name: string;
  extension: string;
};

export enum DreamStatusType {
  NONE = "none",
  QUEUE = "queue",
  PROCESSING = "processing",
  FAILED = "failed",
  PROCESSED = "processed",
}
