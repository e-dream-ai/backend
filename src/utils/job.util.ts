import { redisClient } from "clients/redis.client";
import { APP_LOGGER } from "shared/logger";

/**
 * Function to list values in a queue
 * @param queueName
 * @returns
 */
export const getQueueValues = async (queueName: string) => {
  try {
    const values = await redisClient.lrange(queueName, 0, -1);
    return values;
  } catch (error) {
    APP_LOGGER.error(error);
    return [];
  }
};
