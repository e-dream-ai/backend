import { Router, Request, Response } from "express";
import httpStatus from "http-status";
import env from "shared/env";
import { jsonResponse } from "utils/responses.util";
import {
  isAuthFailureSimulated,
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

  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(httpStatus.BAD_REQUEST).json(
      jsonResponse({
        success: false,
        message: "Body must include { \"enabled\": true | false }",
      }),
    );
  }

  setSimulateAuthFailure(enabled);

  return res.status(httpStatus.OK).json(
    jsonResponse({
      success: true,
      message: `Auth failure simulation ${enabled ? "enabled" : "disabled"}`,
      data: { enabled },
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
      data: { enabled: isAuthFailureSimulated() },
    }),
  );
});

export default simulateAuthFailureRouter;
