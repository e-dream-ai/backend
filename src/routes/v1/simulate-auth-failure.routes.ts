import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import { jsonResponse } from "utils/responses.util";
import {
  AUTH_FAILURE_SIMULATION_MODES,
  AUTH_FAILURE_SIMULATION_TARGETS,
  AuthFailureSimulationMode,
  AuthFailureSimulationTarget,
  getAuthFailureSimulationMode,
  getAuthFailureSimulationTarget,
  isAuthFailureSimulated,
  isValidAuthFailureSimulationMode,
  isValidAuthFailureSimulationTarget,
  setSimulateAuthFailure,
} from "utils/simulate-auth-failure.util";

const simulateAuthFailureRouter = Router();

simulateAuthFailureRouter.post("/", (req: Request, res: Response) => {
  const apiKey = req.headers["x-internal-key"];
  if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json(jsonResponse({ success: false, message: "Unauthorized" }));
  }

  const { enabled, mode, target } = req.body as {
    enabled?: unknown;
    mode?: unknown;
    target?: unknown;
  };

  let nextMode: AuthFailureSimulationMode;

  if (typeof mode !== "undefined") {
    if (!isValidAuthFailureSimulationMode(mode)) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message: "Body \"mode\" must be one of \"off\" | \"503\" | \"400\" | \"hang\"",
        }),
      );
    }
    nextMode = mode;
  } else if (typeof enabled === "boolean") {
    nextMode = enabled
      ? AUTH_FAILURE_SIMULATION_MODES.SERVICE_UNAVAILABLE
      : AUTH_FAILURE_SIMULATION_MODES.OFF;
  } else {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message:
          "Body must include { \"mode\": \"off\" | \"503\" | \"400\" | \"hang\" } or legacy { \"enabled\": true | false }",
      }),
    );
  }

  let nextTarget: AuthFailureSimulationTarget =
    AUTH_FAILURE_SIMULATION_TARGETS.ALL;

  if (typeof target !== "undefined") {
    if (!isValidAuthFailureSimulationTarget(target)) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message:
            "Body \"target\" must be one of \"all\" | \"middleware\" | \"magic-validate\"",
        }),
      );
    }
    nextTarget = target;
  }

  setSimulateAuthFailure(nextMode, nextTarget);

  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      message: `Auth failure simulation set to mode=${nextMode} target=${nextTarget}`,
      data: {
        enabled: nextMode !== AUTH_FAILURE_SIMULATION_MODES.OFF,
        mode: nextMode,
        target: nextTarget,
      },
    }),
  );
});

simulateAuthFailureRouter.get("/", (req: Request, res: Response) => {
  const apiKey = req.headers["x-internal-key"];
  if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json(jsonResponse({ success: false, message: "Unauthorized" }));
  }

  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      data: {
        enabled: isAuthFailureSimulated(),
        mode: getAuthFailureSimulationMode(),
        target: getAuthFailureSimulationTarget(),
      },
    }),
  );
});

export default simulateAuthFailureRouter;
