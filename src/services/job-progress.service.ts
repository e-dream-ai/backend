import { QueueEvents, Queue } from "bullmq";
import type { Socket } from "socket.io";
import { redisClient } from "clients/redis.client";
import { dreamRepository } from "database/repositories";
import { getIo } from "socket/io";
import { APP_LOGGER } from "shared/logger";
import { GENERATION_QUEUES } from "utils/prompt.util";
import { VIDEO_INGEST_QUEUE } from "constants/job.constants";
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
const PROGRESS_SEQ_TTL_SECONDS = PROGRESS_TTL_SECONDS * 2;
const SNAPSHOT_BATCH_SIZE = 200;
const CACHE_WRITE_ATTEMPTS = 5;
const JOB_DATA_CACHE_LIMIT = 500;
const COMPARE_AND_SET = `
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;

interface ScriptedRedis {
  casJobProgress?: (
    key: string,
    expected: string,
    next: string,
    ttl: number,
  ) => Promise<unknown>;
  defineCommand?: (
    name: string,
    options: { numberOfKeys: number; lua: string },
  ) => void;
}

let casDefined = false;

async function compareAndSet(
  key: string,
  expected: string,
  next: string,
): Promise<boolean> {
  const client = redisClient as unknown as ScriptedRedis;

  if (!casDefined && typeof client.defineCommand === "function") {
    client.defineCommand("casJobProgress", {
      numberOfKeys: 1,
      lua: COMPARE_AND_SET,
    });
    casDefined = true;
  }

  const result =
    typeof client.casJobProgress === "function"
      ? await client.casJobProgress(key, expected, next, PROGRESS_TTL_SECONDS)
      : await redisClient.eval(
        COMPARE_AND_SET,
        1,
        key,
        expected,
        next,
        PROGRESS_TTL_SECONDS,
      );

  return Number(result) === 1;
}

export const getDreamProgressKey = (dreamUuid: string): string =>
  `dream:progress:${dreamUuid}`;

const getDreamProgressSeqKey = (dreamUuid: string): string =>
  `dream:progress:seq:${dreamUuid}`;

async function nextSequence(dreamUuid: string): Promise<number | undefined> {
  const key = getDreamProgressSeqKey(dreamUuid);
  const results = await redisClient
    .multi()
    .incr(key)
    .expire(key, PROGRESS_SEQ_TTL_SECONDS)
    .exec();

  const seq = Number(results?.[0]?.[1]);
  return Number.isFinite(seq) ? seq : undefined;
}

export async function cacheDreamProgress(
  incoming: DreamJobProgress,
  authoritative = false,
): Promise<DreamJobProgress | undefined> {
  const key = getDreamProgressKey(incoming.dream_uuid);

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

    next.seq = await nextSequence(incoming.dream_uuid);
    if (await compareAndSet(key, raw ?? "", JSON.stringify(next))) return next;
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
  const snapshots = new Map<string, DreamJobProgress>(
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
      const keys = batch.map(({ uuid }) => getDreamProgressKey(uuid));
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

export async function attachDreamProgress(
  dreams: ReadonlyArray<{ uuid: string; status: string } | null | undefined>,
): Promise<void> {
  const pending = dreams.filter(
    (dream): dream is { uuid: string; status: string } =>
      Boolean(dream?.uuid) &&
      (dream?.status === "queue" || dream?.status === "processing"),
  );
  if (!pending.length) return;

  const snapshots = await getDreamProgressSnapshots(pending);
  for (const dream of pending) {
    Object.assign(dream, { jobProgress: snapshots.get(dream.uuid) });
  }
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
    await publishProgress(
      progressFromDreamStatus(dreamUuid, status, progress),
      userId,
      true,
    );
  } catch (error) {
    APP_LOGGER.error(
      `Error emitting dream job status for ${dreamUuid}:`,
      error,
    );
  }
}

export class JobProgressService {
  private subscriptions: Array<{ queue: Queue; events: QueueEvents }> = [];
  private jobData = new Map<string, Record<string, unknown>>();

  public start(): void {
    if (this.subscriptions.length) return;

    for (const name of [...GENERATION_QUEUES, VIDEO_INGEST_QUEUE]) {
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
      events.on("completed", ({ jobId }) => this.forgetJob(queue.name, jobId));
      events.on("failed", ({ jobId }) => this.relayFailure(queue, jobId));
      this.subscriptions.push({ queue, events });
    }
  }

  private jobKey(queueName: string, jobId: string): string {
    return `${queueName}:${jobId}`;
  }

  private forgetJob(queueName: string, jobId: string): void {
    this.jobData.delete(this.jobKey(queueName, jobId));
  }

  private rememberJob(
    queueName: string,
    jobId: string,
    data: Record<string, unknown>,
  ): void {
    const key = this.jobKey(queueName, jobId);
    this.jobData.delete(key);
    this.jobData.set(key, data);

    if (this.jobData.size > JOB_DATA_CACHE_LIMIT) {
      const oldest = this.jobData.keys().next().value;
      if (oldest !== undefined) this.jobData.delete(oldest);
    }
  }

  private async loadJobData(
    queue: Queue,
    jobId: string,
  ): Promise<Record<string, unknown> | undefined> {
    const cached = this.jobData.get(this.jobKey(queue.name, jobId));
    if (cached) return cached;

    const job = await queue.getJob(jobId);
    if (!job) return;

    const data = isRecord(job.data) ? job.data : {};
    this.rememberJob(queue.name, jobId, data);
    return data;
  }

  private async relayProgress(
    queue: Queue,
    jobId: string,
    data: unknown,
  ): Promise<void> {
    try {
      if (!isRecord(data)) return;
      let payload = data;

      if (queue.name === VIDEO_INGEST_QUEUE && !payload.job_type) {
        const jobData = await this.loadJobData(queue, jobId);
        if (!jobData) return;
        payload = { ...jobData, ...data, job_type: jobData.type ?? "video" };
      }

      const progress = normalizeJobProgress(queue.name, jobId, payload);
      if (!progress) return;

      if (isTerminalProgress(progress)) this.forgetJob(queue.name, jobId);

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

  private async relayFailure(queue: Queue, jobId: string): Promise<void> {
    try {
      const jobData = await this.loadJobData(queue, jobId);
      this.forgetJob(queue.name, jobId);

      const dreamUuid =
        typeof jobData?.dream_uuid === "string"
          ? jobData.dream_uuid
          : undefined;
      if (!dreamUuid) return;

      const progress = normalizeJobProgress(queue.name, jobId, {
        ...jobData,
        status: "FAILED",
      });
      if (!progress) return;

      const userId = jobData?.user_id;
      await publishProgress(
        progress,
        typeof userId === "string" || typeof userId === "number"
          ? userId
          : undefined,
      );
    } catch (error) {
      APP_LOGGER.error(`Error relaying job failure for ${jobId}:`, error);
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
    this.jobData.clear();
  }
}

export const jobProgressService = new JobProgressService();
