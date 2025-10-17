import pino, { type Logger, type Level } from "pino";
import pretty from "pino-pretty";
import env from "../shared/env";

let APP_LOGGER: Logger;

if (env.LOGGING) {
  APP_LOGGER = pino(
    pretty({
      minimumLevel: env.LOGGING_LEVEL as Level,
    }),
  );
} else {
  APP_LOGGER = pino({ enabled: false });
}

export { APP_LOGGER };
