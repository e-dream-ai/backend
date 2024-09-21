import axios from "axios";
import { GAEventKeys } from "constants/google-analytics.constants";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { GAEventKey } from "types/google-analytics.types";

class GA4EventTracker {
  private baseUrl: string;

  constructor(measurementId: string, apiSecret: string) {
    this.baseUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  }

  async sendEvent(eventKey: GAEventKey, eventParams: Record<string, unknown>) {
    try {
      const eventConfig = GAEventKeys[eventKey];
      const payload = {
        events: [
          {
            name: `${eventConfig.category}_${eventConfig.action}`,
            params: {
              ...(eventConfig.label
                ? {
                  [eventConfig.label]:
                      eventParams[eventConfig.label as string],
                }
                : {}),
              ...(eventConfig.value
                ? {
                  [eventConfig.value]:
                      eventParams[eventConfig.value as string],
                }
                : {}),
            },
          },
        ],
      };

      const response = await axios.post(this.baseUrl, payload);
      return response.data;
    } catch (error) {
      APP_LOGGER.error(error);
    }
  }
}

// export tracker
export const tracker = new GA4EventTracker(
  env.GA_MEASUREMENT_ID,
  env.GA_API_SECRET,
);
