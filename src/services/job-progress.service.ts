import { QueueEvents } from "bullmq";
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
  private isInitialized = false;

  public start() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    for (const queueName of QUEUES) {
      const events = new QueueEvents(queueName, {
        connection: redisClient.duplicate(),
      });

      events.on("error", (error) => {
        APP_LOGGER.error(`QueueEvents error on ${queueName}:`, error);
      });

      events.on("progress", async ({ jobId, data }) => {
        try {
          const io = getIo();
          if (!io) return;

          const {
            user_id: userId,
            dream_uuid: dreamUuid,
            status,
            progress: rawProgress,
            preview_frame: previewFrame,
            output,
          } = data as JobProgressData;

          let progress = rawProgress;
          if (progress === undefined && typeof output === "number") {
            progress = output;
          }

          if (dreamUuid && previewFrame) {
            const previewKey = `job:preview:${dreamUuid}`;
            await redisClient.set(previewKey, previewFrame, "EX", 3600); // 1 hour TTL
          }

          if (userId && (progress !== undefined || status)) {
            const roomId = "USER:" + userId;

            io.of("/remote-control").to(roomId).emit("job:progress", {
              jobId,
              dream_uuid: dreamUuid,
              status,
              progress,
              preview_frame: previewFrame,
            });
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
  }
}

export const jobProgressService = new JobProgressService();
