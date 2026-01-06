import { QueueEvents } from "bullmq";
import { redisClient } from "clients/redis.client";
import { getIo } from "socket/io";
import { APP_LOGGER } from "shared/logger";

const QUEUES = ["video", "deforumvideo", "uprezvideo"];

interface JobProgressData {
  user_id: number | string;
  dream_uuid: string;
  progress: number;
}

export class JobProgressService {
  private queueEvents: QueueEvents[] = [];

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners() {
    for (const queueName of QUEUES) {
      const events = new QueueEvents(queueName, {
        connection: redisClient,
      });

      events.on("progress", async ({ jobId, data }) => {
        try {
          const io = getIo();
          if (!io) return;

          const {
            user_id: userId,
            dream_uuid: dreamUuid,
            progress,
          } = data as JobProgressData;

          if (userId && progress !== undefined) {
            const roomId = "USER:" + userId;

            io.of("/remote-control").to(roomId).emit("job:progress", {
              jobId,
              dream_uuid: dreamUuid,
              progress,
            });

            APP_LOGGER.info(
              `Relayed progress ${progress}% for job ${jobId} to namespace /remote-control, room ${roomId}`,
            );
          }
        } catch (error) {
          APP_LOGGER.error(`Error relaying job progress for ${jobId}:`, error);
        }
      });

      this.queueEvents.push(events);
      APP_LOGGER.info(`Listening for progress events on queue: ${queueName}`);
    }
  }

  public async stop() {
    await Promise.all(this.queueEvents.map((e) => e.close()));
  }
}

export const jobProgressService = new JobProgressService();
