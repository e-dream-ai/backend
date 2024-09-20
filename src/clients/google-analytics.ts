import axios from "axios";
import crypto from "crypto";
import env from "shared/env";

class GA4EventTracker {
  private measurementId: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(measurementId: string, apiSecret: string) {
    this.measurementId = measurementId;
    this.apiSecret = apiSecret;
    this.baseUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  }

  generateClientId() {
    return crypto.randomBytes(16).toString("hex");
  }

  async sendEvent(clientId: string, eventName: string, eventParams = {}) {
    const payload = {
      client_id: clientId,
      events: [
        {
          name: eventName,
          params: eventParams,
        },
      ],
    };

    const response = await axios.post(this.baseUrl, payload);
    return response.data;
  }
}

// export tracker
export const tracker = new GA4EventTracker(
  env.GA_MEASUREMENT_ID,
  env.GA_API_SECRET,
);
