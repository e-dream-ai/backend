import { Job, Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { APP_LOGGER } from "shared/logger";
import { GENERATION_QUEUES } from "utils/prompt.util";

interface CancelJobResult {
  success: boolean;
  message: string;
  jobFound: boolean;
  runpodCancelled: boolean;
  previousStatus?: string;
  queueName?: string;
  jobId?: string;
}

const CANCELLED_BY_USER = "Job was cancelled by user";

const stopJob = async (job: Job, state: string): Promise<void> => {
  if (state === "active") {
    try {
      await job.moveToFailed(new Error(CANCELLED_BY_USER), "0", false);
      return;
    } catch (moveError: unknown) {
      const errorMsg =
        moveError instanceof Error ? moveError.message : String(moveError);
      APP_LOGGER.warn(
        `Could not move active job ${job.id} to failed state (${errorMsg}), attempting removal`,
      );
    }
  }

  try {
    await job.remove();
  } catch (removeError: unknown) {
    const removeErrorMsg =
      removeError instanceof Error ? removeError.message : String(removeError);
    APP_LOGGER.warn(
      `Could not remove job ${job.id} (${removeErrorMsg}), job may have already completed`,
    );
  }
};

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
  const queue = new Queue(queueName, {
    connection: redisClient,
  });

  try {
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

    const previousStatus = job.data?.previous_dream_status;
    const state = await job.getState();

    // Mark the job as cancelled by updating its data
    await job.updateData({
      ...job.data,
      cancelled_by_user: true,
      cancel_runpod: cancelRunpod,
    });

    await stopJob(job, state);

    APP_LOGGER.info(
      `Cancelled ${state} job ${job.id} for dream ${dreamUuid} in queue ${queueName}`,
    );

    return {
      success: true,
      message: "Job cancelled successfully",
      jobFound: true,
      runpodCancelled: cancelRunpod && !!job.data?.runpod_id,
      previousStatus,
      queueName,
      jobId: String(job.id),
    };
  } catch (error) {
    APP_LOGGER.error(
      `Failed to cancel job for dream ${dreamUuid} in queue ${queueName}:`,
      error,
    );
    throw error;
  } finally {
    await queue.close();
  }
};

/**
 * Try to find and cancel a job across every generation queue
 * @param dreamUuid - UUID of the dream to cancel
 * @param cancelRunpod - Whether to also cancel the RunPod job
 * @returns Result of the cancellation operation
 */
export const cancelJobAcrossQueues = async (
  dreamUuid: string,
  cancelRunpod: boolean = true,
): Promise<CancelJobResult> => {
  for (const queueName of GENERATION_QUEUES) {
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
      // Log full error for debugging
      APP_LOGGER.error(
        `Error checking queue ${queueName} for dream ${dreamUuid}:`,
        error,
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
