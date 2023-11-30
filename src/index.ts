import bodyParser from "body-parser";
import swaggerDocument from "constants/swagger.json";
import cors from "cors";
import appDataSource from "database/app-data-source";
import express, { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import authMiddleware from "middlewares/auth.middleware";
import { errorMiddleware } from "middlewares/error.middleware";
import authRouter from "routes/v1/auth.router";
import env from "shared/env";
import swaggerUi from "swagger-ui-express";

import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import dreamRouter from "routes/v1/dream.routes";
import feedRouter from "routes/v1/feed.router";
import playlistRouter from "routes/v1/playlist.router";
import userRouter from "routes/v1/user.router";
import { jsonResponse } from "utils/responses.util";
import { APP_LOGGER } from "./shared/logger";

const app: express.Application = express();
const port = env.PORT ?? 8080;
const version = env.npm_package_version;
const swaggerPath = "/api/v1/api-docs";

const customHeaders = (req: Request, res: Response, next: NextFunction) => {
  app.disable("x-powered-by");
  res.setHeader("X-Powered-By", `e-dream.ai ${version}`);
  next();
};

// parse json request body
app.use(bodyParser.json());

// cors middleware
app.use(cors());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// custom headers
app.use(customHeaders);

// auth middleware
app.use(authMiddleware);

// swagger ui
app.use(swaggerPath, swaggerUi.serve);
app.get(swaggerPath, swaggerUi.setup(swaggerDocument));

// establish database connection
appDataSource
  .initialize()
  .then(() => {
    APP_LOGGER.info("Connected with postgres");
  })
  .catch((err) => {
    APP_LOGGER.error("Error during postgres connection", err);
    console.error(err);
  });

/**
 * Register routes
 */

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

// start express server
app.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
});
