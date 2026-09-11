import { VIDEO_INGEST_QUEUE } from "constants/job.constants";
import type {
  DreamJobProgress,
  JobStage,
  JobStatus,
} from "types/job-progress.types";

const DREAM_STATES = new Map<string, [JobStatus, JobStage]>([
  ["queue", ["IN_QUEUE", "queued"]],
  ["processing", ["IN_PROGRESS", "ingesting"]],
  ["processed", ["COMPLETED", "completed"]],
  ["failed", ["FAILED", "failed"]],
  ["none", ["CANCELLED", "idle"]],
]);

const STAGE_ORDER: Record<JobStage, number> = {
  queued: 0,
  rendering: 1,
  ingesting: 2,
  completed: 3,
  failed: 3,
  cancelled: 3,
  idle: 3,
};

const JOB_STATUSES = new Set<string>([
  "IN_QUEUE",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

const isJobStage = (value: unknown): value is JobStage =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(STAGE_ORDER, value);

const isJobStatus = (value: unknown): value is JobStatus =>
  typeof value === "string" && JOB_STATUSES.has(value);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const finiteNumber = (value: unknown): number | undefined => {
  if (typeof value === "string" && value.trim()) value = Number(value);
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const clampMetric = (
  value: number | undefined,
  maximum = Infinity,
): number | null =>
  value === undefined ? null : Math.max(0, Math.min(maximum, value));

export const isTerminalProgress = ({ stage }: DreamJobProgress): boolean =>
  STAGE_ORDER[stage] === 3;

export function progressFromDreamStatus(
  dreamUuid: string,
  status: string,
  progress?: number,
): DreamJobProgress {
  const [jobStatus, stage] = DREAM_STATES.get(status) ?? ["CANCELLED", "idle"];
  const override = finiteNumber(progress);
  return {
    dream_uuid: dreamUuid,
    status: jobStatus,
    stage,
    progress:
      override !== undefined
        ? clampMetric(override, 100)
        : stage === "completed"
          ? 100
          : null,
    countdown_ms: null,
    updated_at: Date.now(),
  };
}

function getJobStage(queue: string, status: string, stage: unknown): JobStage {
  if (status === "CANCELLED") return "cancelled";
  if (status === "FAILED" || status === "TIMED_OUT") return "failed";
  if (
    queue === VIDEO_INGEST_QUEUE ||
    stage === "ingesting" ||
    status === "COMPLETED"
  )
    return "ingesting";
  return status === "IN_QUEUE" ? "queued" : "rendering";
}

export function normalizeJobProgress(
  queue: string,
  jobId: string,
  data: unknown,
): DreamJobProgress | undefined {
  if (!isRecord(data)) return;
  const dreamUuid = asString(data.dream_uuid);
  if (!dreamUuid) return;
  if (
    queue === VIDEO_INGEST_QUEUE &&
    data.job_type !== "video" &&
    data.job_type !== "image"
  )
    return;

  const rawStatus = asString(data.status)?.toUpperCase() ?? "IN_PROGRESS";
  const stage = getJobStage(queue, rawStatus, data.stage);
  let status: JobStatus = rawStatus === "IN_QUEUE" ? "IN_QUEUE" : "IN_PROGRESS";
  if (stage === "failed") status = "FAILED";
  if (stage === "cancelled") status = "CANCELLED";

  const output = isRecord(data.output) ? data.output : {};
  const progress =
    finiteNumber(data.progress) ??
    finiteNumber(output.progress) ??
    finiteNumber(data.output);
  const countdown =
    finiteNumber(data.countdown_ms) ?? finiteNumber(output.countdown_ms);
  const resetMetrics =
    STAGE_ORDER[stage] === 3 ||
    rawStatus === "IN_QUEUE" ||
    (stage === "ingesting" && queue !== VIDEO_INGEST_QUEUE);

  return {
    dream_uuid: dreamUuid,
    jobId,
    queue,
    status,
    stage,
    progress: resetMetrics ? null : clampMetric(progress, 100),
    countdown_ms: resetMetrics ? null : clampMetric(countdown),
    updated_at: Date.now(),
    run_id: asString(data.run_id),
    run_started_at: finiteNumber(data.run_started_at),
  };
}

export function parseCachedProgress(
  raw: string | null,
): DreamJobProgress | undefined {
  if (!raw) return;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || !isJobStage(data.stage)) return;
    if (
      typeof data.dream_uuid !== "string" ||
      !isJobStatus(data.status) ||
      typeof data.updated_at !== "number"
    )
      return;

    return {
      dream_uuid: data.dream_uuid,
      status: data.status,
      stage: data.stage,
      progress: finiteNumber(data.progress) ?? null,
      countdown_ms: finiteNumber(data.countdown_ms) ?? null,
      updated_at: data.updated_at,
      queue: asString(data.queue),
      jobId: asString(data.jobId),
      run_id: asString(data.run_id),
      run_started_at: finiteNumber(data.run_started_at),
      seq: finiteNumber(data.seq),
    };
  } catch {
    return;
  }
}

const isEquivalentProgress = (
  current: DreamJobProgress,
  next: DreamJobProgress,
): boolean =>
  current.run_id === next.run_id &&
  current.queue === next.queue &&
  current.stage === next.stage &&
  current.status === next.status &&
  current.progress === next.progress &&
  current.countdown_ms === next.countdown_ms;

export function shouldAcceptProgress(
  current: DreamJobProgress | undefined,
  next: DreamJobProgress,
): boolean {
  if (!current) return true;
  if (next.run_id && next.run_id !== current.run_id) {
    return (
      (next.run_started_at ?? 0) >
      (current.run_started_at ?? current.updated_at)
    );
  }
  if (isTerminalProgress(current)) return false;
  if (isEquivalentProgress(current, next)) return false;
  if (STAGE_ORDER[next.stage] < STAGE_ORDER[current.stage]) return false;

  const returnedToQueue =
    current.stage === next.stage &&
    current.status === "IN_PROGRESS" &&
    next.status === "IN_QUEUE" &&
    (!current.queue || current.queue === next.queue);
  const lateRenderCompletion =
    current.queue === VIDEO_INGEST_QUEUE &&
    next.queue !== VIDEO_INGEST_QUEUE &&
    next.stage === "ingesting";
  return !returnedToQueue && !lateRenderCompletion;
}
