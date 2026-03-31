import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import appDataSource from "database/app-data-source";
import { redisClient } from "clients/redis.client";
import { jsonResponse } from "utils/responses.util";

type HealthStatus = {
  readonly success: boolean;
  readonly message: string;
  readonly data: {
    readonly version: string;
    readonly db: { readonly ok: boolean };
    readonly redis: { readonly ok: boolean };
  };
};

const HEALTH_DB_TIMEOUT_MS = 1000 as const;
const HEALTH_REDIS_TIMEOUT_MS = 1000 as const;

async function checkDbConnection(): Promise<boolean> {
  if (!appDataSource.isInitialized) {
    return false;
  }
  try {
    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), HEALTH_DB_TIMEOUT_MS),
    );
    const check = appDataSource.manager
      .query("SELECT 1")
      .then(() => true)
      .catch(() => false);
    return await Promise.race([timeout, check]);
  } catch {
    return false;
  }
}

async function checkRedisConnection(): Promise<boolean> {
  try {
    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), HEALTH_REDIS_TIMEOUT_MS),
    );
    const check = redisClient
      .ping()
      .then((res: string) => res === "PONG")
      .catch(() => false);
    return await Promise.race([timeout, check]);
  } catch {
    return false;
  }
}

const healthRouter = Router();

healthRouter.get("/", async (req: Request, res: Response) => {
  const [dbOk, redisOk] = await Promise.all([
    checkDbConnection(),
    checkRedisConnection(),
  ]);

  const body: HealthStatus = {
    success: dbOk && redisOk,
    message: dbOk && redisOk ? "ok" : "degraded",
    data: {
      version: env.npm_package_version,
      db: { ok: dbOk },
      redis: { ok: redisOk },
    },
  };

  const status =
    dbOk && redisOk ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE;
  res.status(status).json(jsonResponse(body));
});

export default healthRouter;
