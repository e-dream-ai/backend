import { QueueEvents, Queue } from "bullmq";
import type { Socket } from "socket.io";
import { redisClient } from "clients/redis.client";
import { dreamRepository } from "database/repositories";
import { getIo } from "socket/io";
import { APP_LOGGER } from "shared/logger";
import { GENERATION_QUEUES } from "utils/prompt.util";
import type { DreamJobProgress } from "types/job-progress.types";
import {
  isRecord,
  isTerminalProgress,
  normalizeJobProgress,
  parseCachedProgress,
  progressFromDreamStatus,
  shouldAcceptProgress,
} from "utils/job-progress.util";

const PROGRESS_TTL_SECONDS = 10800;
const SNAPSHOT_BATCH_SIZE = 200;
const CACHE_WRITE_ATTEMPTS = 5;
const COMPARE_AND_SET = `
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

export const getJobProgressKey = (dreamUuid: string): string =>
  `job:progress:${dreamUuid}`;

export async function cacheDreamProgress(
  incoming: DreamJobProgress,
  authoritative = false,
): Promise<DreamJobProgress | undefined> {
  const key = getJobProgressKey(incoming.dream_uuid);

  for (let attempt = 0; attempt < CACHE_WRITE_ATTEMPTS; attempt++) {
    const raw = await redisClient.get(key);
    const current = parseCachedProgress(raw);
    const run = authoritative ? current : incoming;
    const next = {
      ...incoming,
      run_id: run?.run_id ?? current?.run_id,
      run_started_at: run?.run_started_at ?? current?.run_started_at,
    };
    if (!authoritative && !shouldAcceptProgress(current, next)) return;

    const saved = await redisClient.eval(
      COMPARE_AND_SET,
      1,
      key,
      raw ?? "",
      JSON.stringify(next),
      PROGRESS_TTL_SECONDS,
    );
    if (saved === 1) return next;
  }

  APP_LOGGER.warn(
    `Could not cache concurrent progress for ${incoming.dream_uuid}`,
  );
}

async function publishProgress(
  progress: DreamJobProgress,
  userId?: number | string,
  authoritative = false,
): Promise<void> {
  const saved = await cacheDreamProgress(progress, authoritative);
  if (!saved) return;

  if (isTerminalProgress(saved)) {
    await redisClient.del(`job:preview:${saved.dream_uuid}`);
  }

  const rooms = [`DREAM:${saved.dream_uuid}`];
  if (userId !== undefined) rooms.push(`USER:${userId}`);
  getIo()?.of("/remote-control").to(rooms).emit("job:progress", saved);
}

export async function getDreamProgressSnapshots(
  dreams: ReadonlyArray<{ uuid: string; status: string }>,
): Promise<Map<string, DreamJobProgress>> {
  const snapshots = new Map(
    dreams.map(({ uuid, status }) => [
      uuid,
      progressFromDreamStatus(uuid, status),
    ]),
  );
  const pending = dreams.filter(
    ({ status }) => status === "queue" || status === "processing",
  );

  try {
    for (
      let offset = 0;
      offset < pending.length;
      offset += SNAPSHOT_BATCH_SIZE
    ) {
      const batch = pending.slice(offset, offset + SNAPSHOT_BATCH_SIZE);
      const keys = batch.map(({ uuid }) => getJobProgressKey(uuid));
      const cached = await redisClient.mget(...keys);

      batch.forEach(({ uuid }, index) => {
        const progress = parseCachedProgress(cached[index]);
        if (progress && !isTerminalProgress(progress))
          snapshots.set(uuid, progress);
      });
    }
  } catch (error) {
    APP_LOGGER.error("Could not read dream progress snapshots:", error);
  }

  return snapshots;
}

export async function hydrateDreamProgress(
  socket: Socket,
  dreamUuid: string,
): Promise<void> {
  const dream = await dreamRepository.findOne({
    where: { uuid: dreamUuid },
    select: { uuid: true, status: true },
  });
  if (!dream) return;

  const snapshots = await getDreamProgressSnapshots([dream]);
  socket.emit("job:progress", snapshots.get(dreamUuid));
}

export async function emitDreamJobStatus({
  userId,
  dreamUuid,
  status,
  progress,
}: {
  userId: number | string;
  dreamUuid: string;
  status: string;
  progress?: number;
}): Promise<void> {
  if (!dreamUuid || userId == null) return;

  try {
    const snapshot = progressFromDreamStatus(dreamUuid, status);
    if (progress !== undefined && Number.isFinite(progress)) {
      snapshot.progress = Math.max(0, Math.min(100, progress));
    }
    await publishProgress(snapshot, userId, true);
  } catch (error) {
    APP_LOGGER.error(
      `Error emitting dream job status for ${dreamUuid}:`,
      error,
    );
  }
}

export class JobProgressService {
  private subscriptions: Array<{ queue: Queue; events: QueueEvents }> = [];

  public start(): void {
    if (this.subscriptions.length) return;

    for (const name of [...GENERATION_QUEUES, "videoingest"]) {
      const queue = new Queue(name, { connection: redisClient });
      const events = new QueueEvents(name, {
        connection: redisClient.duplicate(),
      });

      events.on("error", (error) =>
        APP_LOGGER.error(`QueueEvents error on ${name}:`, error),
      );
      events.on("progress", ({ jobId, data }) =>
        this.relayProgress(queue, jobId, data),
      );
      this.subscriptions.push({ queue, events });
    }
  }

  private async relayProgress(
    queue: Queue,
    jobId: string,
    data: unknown,
  ): Promise<void> {
    try {
      if (!isRecord(data)) return;
      let payload = data;

      if (queue.name === "videoingest" && !payload.job_type) {
        const job = await queue.getJob(jobId);
        if (!job) return;
        payload = { ...job.data, ...data, job_type: job.data.type ?? "video" };
      }

      const progress = normalizeJobProgress(queue.name, jobId, payload);
      if (!progress) return;

      const userId = payload.user_id;
      await publishProgress(
        progress,
        typeof userId === "string" || typeof userId === "number"
          ? userId
          : undefined,
      );
    } catch (error) {
      APP_LOGGER.error(`Error relaying job progress for ${jobId}:`, error);
    }
  }

  public async stop(): Promise<void> {
    await Promise.all(
      this.subscriptions.flatMap(({ queue, events }) => [
        queue.close(),
        events.close(),
      ]),
    );
    this.subscriptions = [];
  }
}

export const jobProgressService = new JobProgressService();
