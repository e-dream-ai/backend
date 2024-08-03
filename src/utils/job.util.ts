import axios from "axios";
import { redisClient } from "clients/redis.client";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";

const HEROKU_API_URL = env.HEROKU_API_URL;
const VIDEO_SERVICE_APP_ID_OR_NAME = env.VIDEO_SERVICE_APP_ID_OR_NAME;
const HEROKU_APIKEY = env.HEROKU_APIKEY;

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

/**
 * Send heroku request to API to update resource
 * @param config - resource config
 */
export const updateHerokuFormation = async (config: {
  type: string;
  size: string;
  quantity: number;
}): Promise<boolean> => {
  const payload = {
    updates: [config],
  };

  try {
    await axios.patch(
      `${HEROKU_API_URL}/apps/${VIDEO_SERVICE_APP_ID_OR_NAME}/formation`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.heroku+json; version=3",
          Authorization: `Bearer ${HEROKU_APIKEY}`,
        },
      },
    );

    return true;
  } catch (error) {
    APP_LOGGER.error(error);
    return false;
  }
};

export const updateVideoServiceWorker = async (quantity: number) =>
  updateHerokuFormation({
    quantity,
    size: "performance-L",
    type: "worker",
  });
