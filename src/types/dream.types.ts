export type CreateDreamRequest = object;

export type UpdateDreamRequest = {
  name?: string;
  video?: string;
  thumbnail?: string;
  activityLevel?: number;
};

export enum DreamStatusType {
  NONE = "none",
  QUEUE = "queue",
  PROCESSING = "processing",
  FAILED = "failed",
  PROCESSED = "processed",
}
