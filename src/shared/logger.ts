import pino, { Logger } from "pino";
import pretty from "pino-pretty";
import env from "../shared/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let APP_LOGGER: Logger;

if (env.NODE_ENV === "production") {
  /**
   * Disable logging on production
   */
  APP_LOGGER = pino({ enabled: false });
} else {
  APP_LOGGER = pino(pretty({ minimumLevel: "info" }));
}

export { APP_LOGGER };
