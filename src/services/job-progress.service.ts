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
  render_time_ms?: number;
  countdown_ms?: number;
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
            dream_uuid: dreamUuid,
            status,
            progress: rawProgress,
            render_time_ms: renderTimeMs,
            countdown_ms: countdownMs,
            preview_frame: previewFrame,
            output,
          } = data as JobProgressData;

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

          if (dreamUuid && (progress !== undefined || status)) {
            const dreamRoomId = "DREAM:" + dreamUuid;

            io.of("/remote-control").to(dreamRoomId).emit("job:progress", {
              jobId,
              dream_uuid: dreamUuid,
              status,
              progress,
              render_time_ms: renderTimeMs,
              countdown_ms: countdownMs,
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
