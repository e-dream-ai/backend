import express, { Request, Response } from "express";
import httpStatus from "http-status";
import { errorMiddleware } from "middlewares/error.middleware";
import authRouter from "routes/v1/auth.routes";
import env from "shared/env";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import dreamRouter from "routes/v1/dream.routes";
import feedRouter from "routes/v1/feed.routes";
import playlistRouter from "routes/v1/playlist.routes";
import userRouter from "routes/v1/user.routes";
import { jsonResponse } from "utils/responses.util";

export const registerRoutes = (app: express.Application) => {
  const version = env.npm_package_version;

  // main route
  app.get(["/", "/api/v1"], (req: Request, res: Response) => {
    res.status(httpStatus.OK).send({
      message: `e-dream.ai is running api at version ${version}`,
    });
  });

  // register user router
  app.use("/api/v1/auth", authRouter);

  // register auth router
  app.use("/api/v1/user", userRouter);

  // register dream router
  app.use("/api/v1/dream", dreamRouter);

  // register playlist router
  app.use("/api/v1/playlist", playlistRouter);

  // register playlist router
  app.use("/api/v1/feed", feedRouter);

  app.all("*", (req, res) => {
    res.status(httpStatus.NOT_FOUND);
    if (req.accepts("json")) {
      res.json(
        jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
      );
    } else {
      res.type("txt").send(GENERAL_MESSAGES.NOT_FOUND_404);
    }
  });

  app.use(errorMiddleware);
};
