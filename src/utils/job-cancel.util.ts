import { Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { APP_LOGGER } from "shared/logger";

interface CancelJobResult {
  success: boolean;
  message: string;
  jobFound: boolean;
  runpodCancelled: boolean;
}

/**
 * Cancel a BullMQ job and optionally cancel the associated RunPod job
 * @param queueName - Name of the BullMQ queue
 * @param dreamUuid - UUID of the dream to cancel
 * @param cancelRunpod - Whether to also cancel the RunPod job
 * @returns Result of the cancellation operation
 */
export const cancelJobByDreamUuid = async (
  queueName: string,
  dreamUuid: string,
  cancelRunpod: boolean = true,
): Promise<CancelJobResult> => {
  try {
    const queue = new Queue(queueName, {
      connection: redisClient,
    });

    const [waitingJobs, activeJobs, delayedJobs] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getDelayed(),
    ]);

    const allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs];

    const job = allJobs.find((j) => j.data?.dream_uuid === dreamUuid);

    if (!job) {
      APP_LOGGER.warn(
        `No active job found for dream ${dreamUuid} in queue ${queueName}`,
      );
      await queue.close();
      return {
        success: true,
        message: "No active job found (may have already completed or failed)",
        jobFound: false,
        runpodCancelled: false,
      };
    }

    APP_LOGGER.info(
      `Found job ${job.id} for dream ${dreamUuid} in queue ${queueName}`,
    );

    await job.updateData({
      ...job.data,
      cancelled_by_user: true,
      cancel_runpod: cancelRunpod,
    });

    // Remove the job from the queue
    // This will trigger the 'failed' event in the worker
    await job.remove();

    APP_LOGGER.info(
      `Cancelled job ${job.id} for dream ${dreamUuid} in queue ${queueName}`,
    );

    await queue.close();

    return {
      success: true,
      message: "Job cancelled successfully",
      jobFound: true,
      runpodCancelled: cancelRunpod && !!job.data?.runpod_id,
    };
  } catch (error) {
    APP_LOGGER.error(
      `Failed to cancel job for dream ${dreamUuid} in queue ${queueName}:`,
      error,
    );
    throw error;
  }
};

/**
 * Try to find and cancel a job across multiple queues
 * @param dreamUuid - UUID of the dream to cancel
 * @param cancelRunpod - Whether to also cancel the RunPod job
 * @returns Result of the cancellation operation
 */
export const cancelJobAcrossQueues = async (
  dreamUuid: string,
  cancelRunpod: boolean = true,
): Promise<CancelJobResult> => {
  const queueNames = [
    "deforumvideo",
    "hunyuanvideo",
    "video",
    "image",
    "uprezvideo",
    "want2v",
    "wani2v",
    "wani2vlora",
    "qwenimage",
  ];

  for (const queueName of queueNames) {
    try {
      const result = await cancelJobByDreamUuid(
        queueName,
        dreamUuid,
        cancelRunpod,
      );

      if (result.jobFound) {
        return result;
      }
    } catch (error: unknown) {
      APP_LOGGER.error(
        `Error checking queue ${queueName} for dream ${dreamUuid}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return {
    success: true,
    message: "No active job found in any queue",
    jobFound: false,
    runpodCancelled: false,
  };
};
