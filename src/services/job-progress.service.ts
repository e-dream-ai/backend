import { QueueEvents } from "bullmq";
import { redisClient } from "clients/redis.client";
import { getIo } from "socket/io";
import { APP_LOGGER } from "shared/logger";

const toNumber = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }

  return undefined;
};

const QUEUES = ["video", "deforumvideo", "uprezvideo"];

interface JobProgressData {
  user_id: number | string;
  dream_uuid: string;
  status?: string;
  progress?: number;
  countdown_ms?: number;
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
            countdown_ms: countdownMs,
            output,
          } = data as JobProgressData;

          let progress = toNumber(rawProgress);
          let countdownMsFinal = countdownMs;

          if (output && typeof output === "object") {
            const out = output as Record<string, unknown>;

            if (progress === undefined) progress = toNumber(out.progress);
            if (countdownMsFinal === undefined) {
              const cm = toNumber(out.countdown_ms);
              countdownMsFinal = cm;
            }
          }

          if (dreamUuid && (progress !== undefined || status)) {
            const dreamRoomId = `DREAM:${dreamUuid}`;

            io.of("/remote-control").to(dreamRoomId).emit("job:progress", {
              jobId,
              dream_uuid: dreamUuid,
              status,
              progress,
              countdown_ms: countdownMsFinal,
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
