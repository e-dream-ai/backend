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

export const cancelWorkerJob = async (
  queueName: string,
  jobId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const queue = new Queue(queueName, {
      connection: redisClient,
    });

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      APP_LOGGER.info(
        `Successfully removed active job ${jobId} from queue ${queueName}`,
      );
    } else {
      APP_LOGGER.warn(
        `Could not find job ${jobId} in queue ${queueName} to cancel`,
      );
    }

    await queue.close();
    return { success: true };
  } catch (error) {
    APP_LOGGER.error(`Failed to cancel job ${jobId} in ${queueName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
