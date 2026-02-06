import { Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { MARKETING_QUEUE_NAME } from "constants/marketing.constants";
import { APP_LOGGER } from "shared/logger";

let marketingQueue: Queue | null = null;

const getMarketingQueue = () => {
  if (!marketingQueue) {
    marketingQueue = new Queue(MARKETING_QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
  }

  return marketingQueue;
};

export type MarketingJobData = {
  userId: number;
  email: string;
  templateId: string;
  unsubscribeToken: string;
};

export const enqueueMarketingEmails = async (
  jobs: MarketingJobData[],
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    if (!jobs.length) {
      return { success: true, count: 0 };
    }

    await getMarketingQueue().addBulk(
      jobs.map((job) => ({
        name: "send",
        data: job,
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        },
      })),
    );

    APP_LOGGER.info(
      `Queued ${jobs.length} marketing emails to ${MARKETING_QUEUE_NAME}`,
    );

    return { success: true, count: jobs.length };
  } catch (error) {
    APP_LOGGER.error("Failed to queue marketing emails:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
