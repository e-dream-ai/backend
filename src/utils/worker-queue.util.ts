import { randomUUID } from "crypto";
import { Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { APP_LOGGER } from "shared/logger";
import {
  IMAGE_NORMALIZE_QUEUE,
  VIDEO_INGEST_QUEUE,
} from "constants/job.constants";
import type { ImageNormalizeJobData } from "types/image.types";

type JobData = {
  dream_uuid: string;
  auto_upload?: boolean;
  infinidream_algorithm: string;
  previous_dream_status?: string;
  [key: string]: unknown;
};

type VideoIngestJobData = {
  type: "video" | "image" | "md5" | "filmstrip";
  dream_uuid: string;
  extension?: string;
  user_id?: number;
};

type QueueResult = { success: boolean; jobId?: string; error?: string };

const enqueueJob = async (
  queueName: string,
  jobData: { dream_uuid: string } & Record<string, unknown>,
  progressExtras: Record<string, unknown> = {},
  label = "job",
): Promise<QueueResult> => {
  try {
    const queue = new Queue(queueName, {
      connection: redisClient,
    });

    const run = { run_id: randomUUID(), run_started_at: Date.now() };
    const job = await queue.add("message", { ...jobData, ...run });

    await job.updateProgress({
      ...run,
      dream_uuid: jobData.dream_uuid,
      user_id: jobData.user_id,
      status: "IN_QUEUE",
      progress: null,
      ...progressExtras,
    });

    await queue.close();

    APP_LOGGER.info(
      `Queued ${label} ${job.id} to ${queueName} for dream ${jobData.dream_uuid}`,
    );

    return { success: true, jobId: job.id };
  } catch (error) {
    APP_LOGGER.error(`Failed to queue ${label} to ${queueName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const queueWorkerJob = (
  queueName: string,
  jobData: JobData,
): Promise<QueueResult> => enqueueJob(queueName, jobData);

export const queueVideoIngestJob = (
  jobData: VideoIngestJobData,
): Promise<QueueResult> =>
  enqueueJob(
    VIDEO_INGEST_QUEUE,
    jobData,
    { stage: "ingesting", job_type: jobData.type },
    `videoingest job (${jobData.type})`,
  );

let imageNormalizeQueue: Queue<ImageNormalizeJobData> | undefined;

const getImageNormalizeQueue = () =>
  (imageNormalizeQueue ??= new Queue<ImageNormalizeJobData>(
    IMAGE_NORMALIZE_QUEUE,
    { connection: redisClient },
  ));

export const queueImageNormalizeJob = async (
  jobData: ImageNormalizeJobData,
): Promise<QueueResult> => {
  try {
    const job = await getImageNormalizeQueue().add("message", jobData, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    });
    return { success: true, jobId: job.id };
  } catch (error) {
    APP_LOGGER.error(
      `Failed to queue image normalize job for ${jobData.object_key}:`,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
