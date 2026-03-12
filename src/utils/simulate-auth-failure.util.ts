import { APP_LOGGER } from "shared/logger";

let simulateAuthFailure = false;

export const isAuthFailureSimulated = (): boolean => simulateAuthFailure;

export const setSimulateAuthFailure = (value: boolean): void => {
  simulateAuthFailure = value;
  APP_LOGGER.warn(`Simulate auth failure set to: ${value}`);
};
