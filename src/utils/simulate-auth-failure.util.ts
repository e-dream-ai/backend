import httpStatus from "http-status";
import { APP_LOGGER } from "shared/logger";
import { ResponseType } from "types/express.types";
import { jsonResponse } from "utils/responses.util";

export const AUTH_FAILURE_SIMULATION_MODES = {
  OFF: "off",
  SERVICE_UNAVAILABLE: "503",
  BAD_REQUEST: "400",
  HANG: "hang",
  MALFORMED: "malformed",
} as const;

export const AUTH_FAILURE_SIMULATION_TARGETS = {
  ALL: "all",
  MIDDLEWARE: "middleware",
  MAGIC_VALIDATE: "magic-validate",
} as const;

export type AuthFailureSimulationMode =
  (typeof AUTH_FAILURE_SIMULATION_MODES)[keyof typeof AUTH_FAILURE_SIMULATION_MODES];

export type AuthFailureSimulationTarget =
  (typeof AUTH_FAILURE_SIMULATION_TARGETS)[keyof typeof AUTH_FAILURE_SIMULATION_TARGETS];

const AUTH_FAILURE_SIMULATION_MODE_SET = new Set<AuthFailureSimulationMode>(
  Object.values(AUTH_FAILURE_SIMULATION_MODES) as AuthFailureSimulationMode[],
);

const AUTH_FAILURE_SIMULATION_TARGET_SET = new Set<AuthFailureSimulationTarget>(
  Object.values(
    AUTH_FAILURE_SIMULATION_TARGETS,
  ) as AuthFailureSimulationTarget[],
);

let simulateAuthFailureMode: AuthFailureSimulationMode =
  AUTH_FAILURE_SIMULATION_MODES.OFF;

let simulateAuthFailureTarget: AuthFailureSimulationTarget =
  AUTH_FAILURE_SIMULATION_TARGETS.ALL;

const neverResolve = (): Promise<never> => new Promise(() => undefined);

export const getAuthFailureSimulationMode = (): AuthFailureSimulationMode =>
  simulateAuthFailureMode;

export const getAuthFailureSimulationTarget = (): AuthFailureSimulationTarget =>
  simulateAuthFailureTarget;

export const isAuthFailureSimulated = (): boolean =>
  simulateAuthFailureMode !== AUTH_FAILURE_SIMULATION_MODES.OFF;

export const isValidAuthFailureSimulationMode = (
  value: unknown,
): value is AuthFailureSimulationMode =>
  typeof value === "string" &&
  AUTH_FAILURE_SIMULATION_MODE_SET.has(value as AuthFailureSimulationMode);

export const isValidAuthFailureSimulationTarget = (
  value: unknown,
): value is AuthFailureSimulationTarget =>
  typeof value === "string" &&
  AUTH_FAILURE_SIMULATION_TARGET_SET.has(value as AuthFailureSimulationTarget);

export const setSimulateAuthFailure = (
  value: boolean | AuthFailureSimulationMode,
  target: AuthFailureSimulationTarget = AUTH_FAILURE_SIMULATION_TARGETS.ALL,
): void => {
  simulateAuthFailureMode =
    typeof value === "boolean"
      ? value
        ? AUTH_FAILURE_SIMULATION_MODES.SERVICE_UNAVAILABLE
        : AUTH_FAILURE_SIMULATION_MODES.OFF
      : value;

  simulateAuthFailureTarget = target;

  APP_LOGGER.warn(
    `Simulate auth failure mode set to: ${simulateAuthFailureMode}, target: ${simulateAuthFailureTarget}`,
  );
};

const buildSimulatedResponse = (
  res: ResponseType,
  context: string,
): ResponseType | Promise<never> => {
  const mode = simulateAuthFailureMode;

  APP_LOGGER.warn(
    `Simulated auth failure triggered (${context}) with mode: ${mode}`,
  );

  if (mode === AUTH_FAILURE_SIMULATION_MODES.MALFORMED) {
    return res.status(httpStatus.OK).json({
      success: true,
      data: { sealedSession: "test-sealed-session-abc123" },
    });
  }

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

export const applySimulatedAuthFailure = (
  res: ResponseType,
  context: string,
): ResponseType | Promise<never> | null => {
  if (simulateAuthFailureMode === AUTH_FAILURE_SIMULATION_MODES.OFF) {
    return null;
  }

  const target = simulateAuthFailureTarget;
  if (
    target !== AUTH_FAILURE_SIMULATION_TARGETS.ALL &&
    target !== AUTH_FAILURE_SIMULATION_TARGETS.MIDDLEWARE
  ) {
    return null;
  }

  return buildSimulatedResponse(res, context);
};

export const applySimulatedAuthFailureForMagicValidate = (
  res: ResponseType,
): ResponseType | Promise<never> | null => {
  if (simulateAuthFailureMode === AUTH_FAILURE_SIMULATION_MODES.OFF) {
    return null;
  }

  const target = simulateAuthFailureTarget;
  if (
    target !== AUTH_FAILURE_SIMULATION_TARGETS.ALL &&
    target !== AUTH_FAILURE_SIMULATION_TARGETS.MAGIC_VALIDATE
  ) {
    return null;
  }

  return buildSimulatedResponse(res, "magic-validate");
};
