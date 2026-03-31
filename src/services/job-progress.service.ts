import { QueueEvents, Queue } from "bullmq";
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
  preview_frame?: string;
  output?: number | unknown;
}

export const getJobProgressKey = (dreamUuid: string) =>
  `job:progress:${dreamUuid}`;

export class JobProgressService {
  private queueEvents: QueueEvents[] = [];
  private queues: Map<string, Queue> = new Map();
  private isInitialized = false;

  public start() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    for (const queueName of QUEUES) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: redisClient }),
      );

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
            const progressData = {
              jobId,
              dream_uuid: dreamUuid,
              status,
              progress,
              countdown_ms: countdownMsFinal,
              updated_at: Date.now(),
            };

            await redisClient.set(
              getJobProgressKey(dreamUuid),
              JSON.stringify(progressData),
              "EX",
              10800, // 3 hours TTL is enough for active jobs
            );

            io.of("/remote-control")
              .to(dreamRoomId)
              .emit("job:progress", progressData);
          }
        } catch (error) {
          APP_LOGGER.error(`Error relaying job progress for ${jobId}:`, error);
        }
      });

      events.on("completed", async ({ jobId }) => {
        try {
          const job = await this.queues.get(queueName)!.getJob(jobId);
          if (job?.data?.dream_uuid) {
            await redisClient.del(getJobProgressKey(job.data.dream_uuid));
            await redisClient.del(`job:preview:${job.data.dream_uuid}`);
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      });

      events.on("failed", async ({ jobId }) => {
        try {
          const job = await this.queues.get(queueName)!.getJob(jobId);
          if (job?.data?.dream_uuid) {
            await redisClient.del(getJobProgressKey(job.data.dream_uuid));
            await redisClient.del(`job:preview:${job.data.dream_uuid}`);
          }
        } catch (error) {
          // Ignore
        }
      });

      this.queueEvents.push(events);
    }
  }

  public async stop() {
    await Promise.all([
      ...this.queueEvents.map((e) => e.close()),
      ...Array.from(this.queues.values()).map((q) => q.close()),
    ]);
  }
}

export const jobProgressService = new JobProgressService();
