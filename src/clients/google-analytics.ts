import axios from "axios";
import { GAEventKeys } from "constants/google-analytics.constants";
import env from "shared/env";
import { APP_LOGGER } from "shared/logger";
import { GAEventKey } from "types/google-analytics.types";
import crypto from "crypto";
import { ResponseType } from "types/express.types";
import { Socket } from "socket.io";
import { parseClientType } from "utils/client-type.util";

class GA4EventTracker {
  private baseUrl: string;

  constructor(measurementId: string, apiSecret: string) {
    this.baseUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  }

  async sendEvent(
    userUUID: string,
    eventKey: GAEventKey,
    eventParams: Record<string, unknown>,
  ) {
    try {
      const hash = crypto.createHash("sha256");

      // Update the hash object with the user ID string
      // (Node.js automatically encodes the string to UTF-8)
      hash.update(userUUID);

      // Generate and return the hexadecimal representation of the hash
      const hashedUserUUID = hash.digest("hex");

      const eventConfig = GAEventKeys[eventKey];

      // Report the platform, architecture and OS version separately, so that
      // app_type groups by platform whatever the OS version is.
      const clientParams: Record<string, unknown> = {};
      if (typeof eventParams.app_type === "string") {
        const client = parseClientType(eventParams.app_type);
        clientParams.app_type = client.type;
        clientParams.app_arch = client.arch;
        clientParams.app_os_version = client.osVersion;
      }

      const payload = {
        client_id: hashedUserUUID,
        user_id: userUUID,
        events: [
          {
            name: `${eventConfig.category}_${eventConfig.action}`,
            params: {
              user_uuid: userUUID,
              ...eventParams, // Include all other parameters
              ...clientParams,
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

  async sendEventWithRequestContext(
    res: ResponseType,
    userUUID: string,
    eventKey: GAEventKey,
    eventParams: Record<string, unknown>,
  ) {
    const params = {
      ...eventParams,
      app_type: res.locals.requestContext?.type,
      app_version: res.locals.requestContext?.version,
    };
    this.sendEvent(userUUID, eventKey, params);
  }

  async sendEventWithSocketRequestContext(
    socket: Socket,
    userUUID: string,
    eventKey: GAEventKey,
    eventParams: Record<string, unknown>,
  ) {
    const params = {
      ...eventParams,
      app_type: socket.data.requestContext?.type,
      app_version: socket.data.requestContext?.version,
    };
    this.sendEvent(userUUID, eventKey, params);
  }
}

// export tracker
export const tracker = new GA4EventTracker(
  env.GA_MEASUREMENT_ID,
  env.GA_API_SECRET,
);
