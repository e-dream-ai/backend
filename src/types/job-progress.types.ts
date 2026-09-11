export type JobStage =
  | "queued"
  | "rendering"
  | "ingesting"
  | "completed"
  | "failed"
  | "cancelled"
  | "idle";

export type JobStatus =
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface DreamJobProgress {
  dream_uuid: string;
  status: JobStatus;
  stage: JobStage;
  progress: number | null;
  countdown_ms: number | null;
  updated_at: number;
  jobId?: string;
  queue?: string;
  run_id?: string;
  run_started_at?: number;
  seq?: number;
}

export interface PlaylistProgress {
  total: number;
  queued: number;
  rendering: number;
  ingesting: number;
  completed: number;
  failed: number;
  idle: number;
  remaining: number;
}
