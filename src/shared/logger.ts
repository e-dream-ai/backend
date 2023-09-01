import pino from "pino";
import pretty from "pino-pretty";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let APP_LOGGER: any;

if (process.env.NOLOG === "true") {
  APP_LOGGER = pino({ enabled: false });
} else {
  APP_LOGGER = process.env.NODE_ENV === "production" ? pino() : pino(pretty());
}

export { APP_LOGGER };
