import v8 from "v8";
import fs from "fs";
import path from "path";
import os from "os";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "clients/r2.client";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";

const SNAPSHOT_FOLDER = "heapsnapshots";
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type SnapshotTrigger = "AUTOMATIC" | "MANUAL";

let schedulerInterval: NodeJS.Timeout | null = null;

function buildObjectKey(trigger: SnapshotTrigger): string {
  const utcTime = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
  const filename = `heapsnapshot-${utcTime}-pid${process.pid}-${trigger}.heapsnapshot`;
  return `${SNAPSHOT_FOLDER}/${filename}`;
}

export async function takeAndUploadHeapSnapshot(
  trigger: SnapshotTrigger,
): Promise<string> {
  const r2Key = buildObjectKey(trigger);
  const tmpPath = path.join(os.tmpdir(), path.basename(r2Key));

  APP_LOGGER.info(`[HeapSnapshot] Taking snapshot → ${r2Key}`);

  v8.writeHeapSnapshot(tmpPath);

  const fileSize = fs.statSync(tmpPath).size;
  APP_LOGGER.info(
    `[HeapSnapshot] Snapshot written (${Math.round(
      fileSize / 1024 / 1024,
    )}MB), uploading to R2...`,
  );

  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: fs.createReadStream(tmpPath),
        ContentLength: fileSize,
        ContentType: "application/octet-stream",
      }),
    );

    APP_LOGGER.info(`[HeapSnapshot] Uploaded to R2: ${r2Key}`);
    return r2Key;
  } finally {
    fs.unlinkSync(tmpPath);
    APP_LOGGER.info(`[HeapSnapshot] Cleaned up temp file: ${tmpPath}`);
  }
}

export function startHeapSnapshotScheduler(): void {
  if (!env.HEAP_SNAPSHOT_API_KEY) {
    APP_LOGGER.info(
      "[HeapSnapshot] HEAP_SNAPSHOT_API_KEY not set — scheduler disabled",
    );
    return;
  }

  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    try {
      await takeAndUploadHeapSnapshot("AUTOMATIC");
    } catch (err) {
      APP_LOGGER.error("[HeapSnapshot] Scheduled snapshot failed:", err);
    }
  }, INTERVAL_MS);

  APP_LOGGER.info(
    `[HeapSnapshot] Scheduler started (pid ${process.pid}, every ${
      INTERVAL_MS / 60000
    } min)`,
  );
}

export function stopHeapSnapshotScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    APP_LOGGER.info("[HeapSnapshot] Scheduler stopped");
  }
}
