import pino, { Logger } from "pino";
import pretty from "pino-pretty";
import env from "../shared/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let APP_LOGGER: Logger<string>;

if (env.NODE_ENV === "production") {
  /**
   * Disable logging on production
   */
  APP_LOGGER = pino({ enabled: false });
} else if (env.NODE_ENV === "stage") {
  APP_LOGGER = pino(pretty({ minimumLevel: "warn" }));
} else {
  APP_LOGGER = pino(pretty({ minimumLevel: "trace" }));
}

export { APP_LOGGER };
