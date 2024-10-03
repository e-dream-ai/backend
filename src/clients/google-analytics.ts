import axios from "axios";
import { GAEventKeys } from "constants/google-analytics.constants";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { GAEventKey } from "types/google-analytics.types";
import crypto from "crypto";

class GA4EventTracker {
  private baseUrl: string;

  constructor(measurementId: string, apiSecret: string) {
    this.baseUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  }

  async sendEvent(
    userId: string,
    eventKey: GAEventKey,
    eventParams: Record<string, unknown>,
  ) {
    try {
      const hash = crypto.createHash("sha256");

      // Update the hash object with the user ID string
      // (Node.js automatically encodes the string to UTF-8)
      hash.update(userId);

      // Generate and return the hexadecimal representation of the hash
      const hashedUserId = hash.digest("hex");

      const eventConfig = GAEventKeys[eventKey];

      const payload = {
        client_id: hashedUserId,
        user_id: userId,
        events: [
          {
            name: `${eventConfig.category}_${eventConfig.action}`,
            params: {
              ...eventParams, // Include all other parameters
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
