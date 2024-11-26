import pino, { Level, Logger } from "pino";
import pretty from "pino-pretty";
import env from "../shared/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let APP_LOGGER: Logger<string>;

if (env.LOGGING) {
  APP_LOGGER = pino(pretty({ minimumLevel: env.LOGGING_LEVEL as Level }));
} else {
  APP_LOGGER = pino({ enabled: false });
}

export { APP_LOGGER };
