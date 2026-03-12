import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import { jsonResponse } from "utils/responses.util";
import {
  AUTH_FAILURE_SIMULATION_MODES,
  AuthFailureSimulationMode,
  getAuthFailureSimulationMode,
  isAuthFailureSimulated,
  isValidAuthFailureSimulationMode,
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

  const { enabled, mode } = req.body as {
    enabled?: unknown;
    mode?: unknown;
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

  setSimulateAuthFailure(nextMode);

  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      message: `Auth failure simulation mode set to ${nextMode}`,
      data: {
        enabled: nextMode !== AUTH_FAILURE_SIMULATION_MODES.OFF,
        mode: nextMode,
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
      },
    }),
  );
});

export default simulateAuthFailureRouter;
