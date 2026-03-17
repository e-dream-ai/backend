import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";

export const AUTH_FAILURE_SIMULATION_MODES = {
  OFF: "off",
  SERVICE_UNAVAILABLE: "503",
  BAD_REQUEST: "400",
  HANG: "hang",
} as const;

export type AuthFailureSimulationMode =
  (typeof AUTH_FAILURE_SIMULATION_MODES)[keyof typeof AUTH_FAILURE_SIMULATION_MODES];

const AUTH_FAILURE_SIMULATION_MODE_SET = new Set<AuthFailureSimulationMode>(
  Object.values(AUTH_FAILURE_SIMULATION_MODES) as AuthFailureSimulationMode[],
);

let simulateAuthFailureMode: AuthFailureSimulationMode =
  AUTH_FAILURE_SIMULATION_MODES.OFF;

const neverResolve = (): Promise<never> => new Promise(() => undefined);

export const getAuthFailureSimulationMode = (): AuthFailureSimulationMode =>
  simulateAuthFailureMode;

export const isAuthFailureSimulated = (): boolean =>
  simulateAuthFailureMode !== AUTH_FAILURE_SIMULATION_MODES.OFF;

export const isValidAuthFailureSimulationMode = (
  value: unknown,
): value is AuthFailureSimulationMode =>
  typeof value === "string" &&
  AUTH_FAILURE_SIMULATION_MODE_SET.has(value as AuthFailureSimulationMode);

export const setSimulateAuthFailure = (
  value: boolean | AuthFailureSimulationMode,
): void => {
  simulateAuthFailureMode =
    typeof value === "boolean"
      ? value
        ? AUTH_FAILURE_SIMULATION_MODES.SERVICE_UNAVAILABLE
        : AUTH_FAILURE_SIMULATION_MODES.OFF
      : value;

  APP_LOGGER.warn(
    `Simulate auth failure mode set to: ${simulateAuthFailureMode}`,
  );
};

export const applySimulatedAuthFailure = (
  res: ResponseType,
  context: string,
): ResponseType | Promise<never> | null => {
  const mode = getAuthFailureSimulationMode();

  if (mode === AUTH_FAILURE_SIMULATION_MODES.OFF) {
    return null;
  }

  APP_LOGGER.warn(
    `Simulated auth failure triggered (${context}) with mode: ${mode}`,
  );

  if (mode === AUTH_FAILURE_SIMULATION_MODES.BAD_REQUEST) {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message: "Authentication request rejected for simulation",
      }),
    );
  }

  if (mode === AUTH_FAILURE_SIMULATION_MODES.HANG) {
    return neverResolve();
  }

  return res.status(httpStatus.SERVICE_UNAVAILABLE).json(
    jsonResponse({
      success: false,
      message: "Authentication service temporarily unavailable",
    }),
  );
};
