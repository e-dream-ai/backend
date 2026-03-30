import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import { jsonResponse } from "utils/responses.util";
import {
  HELLO_SIMULATION_MODES,
  HelloSimulationMode,
  getHelloSimulationMode,
  isHelloSimulated,
  isValidHelloSimulationMode,
  setSimulateHello,
} from "utils/simulate-hello.util";

const simulateHelloRouter = Router();

simulateHelloRouter.post("/", (req: Request, res: Response) => {
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

  let nextMode: HelloSimulationMode;

  if (typeof mode !== "undefined") {
    if (!isValidHelloSimulationMode(mode)) {
      return res.status(httpStatus.BAD_REQUEST).json(
        jsonResponse({
          success: false,
          message:
            "Body \"mode\" must be one of \"off\" | \"503\" | \"400\" | \"hang\" | \"500\"",
        }),
      );
    }
    nextMode = mode;
  } else if (typeof enabled === "boolean") {
    nextMode = enabled
      ? HELLO_SIMULATION_MODES.SERVICE_UNAVAILABLE
      : HELLO_SIMULATION_MODES.OFF;
  } else {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message:
          "Body must include { \"mode\": \"off\" | \"503\" | \"400\" | \"hang\" | \"500\" } or legacy { \"enabled\": true | false }",
      }),
    );
  }

  setSimulateHello(nextMode);

  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      message: `Hello simulation set to mode=${nextMode}`,
      data: {
        enabled: nextMode !== HELLO_SIMULATION_MODES.OFF,
        mode: nextMode,
      },
    }),
  );
});

simulateHelloRouter.get("/", (req: Request, res: Response) => {
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
        enabled: isHelloSimulated(),
        mode: getHelloSimulationMode(),
      },
    }),
  );
});

export default simulateHelloRouter;
