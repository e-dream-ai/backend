import { Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { APP_LOGGER } from "shared/logger";

interface JobData {
  dream_uuid: string;
  auto_upload?: boolean;
  infinidream_algorithm: string;
  [key: string]: unknown;
}

export const queueWorkerJob = async (
  queueName: string,
  jobData: JobData,
): Promise<{ success: boolean; jobId?: string; error?: string }> => {
  try {
    const queue = new Queue(queueName, {
      connection: redisClient,
    });

    const job = await queue.add("message", jobData);

    await queue.close();

    APP_LOGGER.info(
      `Queued job ${job.id} to ${queueName} for dream ${jobData.dream_uuid}`,
    );

    return {
      success: true,
      jobId: job.id,
    };
  } catch (error) {
    APP_LOGGER.error(`Failed to queue job to ${queueName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
