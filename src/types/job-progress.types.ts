export type JobStage =
  | "queued"
  | "rendering"
  | "ingesting"
  | "completed"
  | "failed"
  | "cancelled"
  | "idle";

export interface DreamJobProgress {
  dream_uuid: string;
  status: string;
  stage: JobStage;
  progress: number | null;
  countdown_ms: number | null;
  updated_at: number;
  jobId?: string;
  queue?: string;
  run_id?: string;
  run_started_at?: number;
}

export interface PlaylistProgress {
  total: number;
  completed: number;
  queued: number;
  inProgress: number;
  failed: number;
  idle: number;
  remaining: number;
}
