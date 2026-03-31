import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";

export const HELLO_SIMULATION_MODES = {
  OFF: "off",
  SERVICE_UNAVAILABLE: "503",
  BAD_REQUEST: "400",
  HANG: "hang",
  INTERNAL_SERVER_ERROR: "500",
} as const;

export type HelloSimulationMode =
  (typeof HELLO_SIMULATION_MODES)[keyof typeof HELLO_SIMULATION_MODES];

const HELLO_SIMULATION_MODE_SET = new Set<HelloSimulationMode>(
  Object.values(HELLO_SIMULATION_MODES) as HelloSimulationMode[],
);

let simulateHelloMode: HelloSimulationMode = HELLO_SIMULATION_MODES.OFF;

const neverResolve = (): Promise<never> => new Promise(() => undefined);

export const getHelloSimulationMode = (): HelloSimulationMode =>
  simulateHelloMode;

export const isHelloSimulated = (): boolean =>
  simulateHelloMode !== HELLO_SIMULATION_MODES.OFF;

export const isValidHelloSimulationMode = (
  value: unknown,
): value is HelloSimulationMode =>
  typeof value === "string" &&
  HELLO_SIMULATION_MODE_SET.has(value as HelloSimulationMode);

export const setSimulateHello = (
  value: boolean | HelloSimulationMode,
): void => {
  simulateHelloMode =
    typeof value === "boolean"
      ? value
        ? HELLO_SIMULATION_MODES.SERVICE_UNAVAILABLE
        : HELLO_SIMULATION_MODES.OFF
      : value;

  APP_LOGGER.warn(`Simulate hello mode set to: ${simulateHelloMode}`);
};

export const applySimulatedHello = (
  res: ResponseType,
): ResponseType | Promise<never> | null => {
  if (simulateHelloMode === HELLO_SIMULATION_MODES.OFF) {
    return null;
  }

  const mode = simulateHelloMode;

  APP_LOGGER.warn(`Simulated hello failure triggered with mode: ${mode}`);

  if (mode === HELLO_SIMULATION_MODES.BAD_REQUEST) {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message: "Hello request rejected for simulation",
      }),
    );
  }

  if (mode === HELLO_SIMULATION_MODES.HANG) {
    return neverResolve();
  }

  if (mode === HELLO_SIMULATION_MODES.INTERNAL_SERVER_ERROR) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
      jsonResponse({
        success: false,
        message: "Internal server error (simulated)",
      }),
    );
  }

  // Default: SERVICE_UNAVAILABLE
  return res.status(httpStatus.SERVICE_UNAVAILABLE).json(
    jsonResponse({
      success: false,
      message: "Hello service temporarily unavailable (simulated)",
    }),
  );
};
