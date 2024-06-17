import Redis, { RedisOptions } from "ioredis";
import env from "shared/env";

// Get the Redis URL from the environment variable set by Heroku
const REDIS_HOST = env.REDIS_HOST;
const REDIS_PORT = env.REDIS_PORT;
const REDIS_PASSWORD = env.REDIS_PASSWORD;
const REDISCLOUD_URL = env.REDISCLOUD_URL;

/**
 * redis config
 */
const redisConfig: RedisOptions | string = REDISCLOUD_URL ?? {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};

// Create a custom Redis client
export const redisClient = new Redis(redisConfig, {
  maxRetriesPerRequest: null,
});
