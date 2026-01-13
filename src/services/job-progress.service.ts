import { QueueEvents, Queue } from "bullmq";
import { redisClient } from "clients/redis.client";
import { getIo } from "socket/io";
import { APP_LOGGER } from "shared/logger";

const QUEUES = ["video", "deforumvideo", "uprezvideo"];

interface JobProgressData {
  user_id: number | string;
  dream_uuid: string;
  status?: string;
  progress?: number;
  preview_frame?: string;
  output?: number | unknown;
}

export class JobProgressService {
  private queueEvents: QueueEvents[] = [];
  private queues: Map<string, Queue> = new Map();
  private isInitialized = false;

  public start() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    for (const queueName of QUEUES) {
      const events = new QueueEvents(queueName, {
        connection: redisClient.duplicate(),
      });

      const queue = new Queue(queueName, {
        connection: redisClient.duplicate(),
      });
      this.queues.set(queueName, queue);

      events.on("error", (error) => {
        APP_LOGGER.error(`QueueEvents error on ${queueName}:`, error);
      });

      events.on("progress", async ({ jobId, data }) => {
        try {
          const io = getIo();
          if (!io) return;

          let progressData: JobProgressData =
            typeof data === "object" && data !== null
              ? (data as JobProgressData)
              : ({} as JobProgressData);

          if (
            typeof data !== "object" ||
            data === null ||
            !("user_id" in data)
          ) {
            const job = await queue.getJob(jobId);
            if (job) {
              progressData = {
                ...progressData,
                user_id: job.data.user_id,
                dream_uuid: job.data.dream_uuid,
              };

              if (typeof data === "number") {
                progressData.progress = data;
              }
            }
          }

          const {
            user_id: userId,
            dream_uuid: dreamUuid,
            status,
            progress: rawProgress,
            preview_frame: previewFrame,
            output,
          } = progressData;

          let progress = rawProgress;
          if (progress === undefined && typeof output === "number") {
            progress = output;
          }

          if (dreamUuid && previewFrame) {
            const previewKey = `job:preview:${dreamUuid}`;
            APP_LOGGER.info(
              `[JobProgress] Saving preview for ${dreamUuid} (${previewFrame.length} bytes)`,
            );
            await redisClient.set(previewKey, previewFrame, "EX", 10800); // 3 hours TTL
          } else if (previewFrame) {
            APP_LOGGER.warn(
              `[JobProgress] Received preview frame but dream_uuid is missing for job ${jobId}`,
            );
          }

          if (userId && (progress !== undefined || status)) {
            const roomId = "USER:" + userId;

            APP_LOGGER.info(
              `[JobProgress] Emitting progress for user ${userId}, job ${jobId}: ${progress}% ${
                status || ""
              }`,
            );

            io.of("/remote-control").to(roomId).emit("job:progress", {
              jobId,
              dream_uuid: dreamUuid,
              status,
              progress,
            });
          } else if (!userId) {
            APP_LOGGER.warn(
              `[JobProgress] Missing userId for job ${jobId} on queue ${queueName}. Data: ${JSON.stringify(
                data,
              )}`,
            );
          }
        } catch (error) {
          APP_LOGGER.error(`Error relaying job progress for ${jobId}:`, error);
        }
      });

      this.queueEvents.push(events);
    }
  }

  public async stop() {
    await Promise.all(this.queueEvents.map((e) => e.close()));
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}

export const jobProgressService = new JobProgressService();
