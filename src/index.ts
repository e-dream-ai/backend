import "dotenv/config";

import { json } from "body-parser";
import cors from "cors";
import appDataSource from "database/app-data-source";
import express, { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { errorMiddleware } from "middlewares/error.middleware";
import authRouter from "routes/v1/auth.router";
import env from "shared/env";

import { APP_LOGGER } from "./shared/logger";

const app: express.Application = express();
const port = env.PORT ?? 8080;
const version = env.npm_package_version;

const customHeaders = (req: Request, res: Response, next: NextFunction) => {
  app.disable("x-powered-by");
  res.setHeader("X-Powered-By", `e-dream.ai ${version}`);
  next();
};

// parse json request body
app.use(json());

// cors middleware
app.use(cors());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// custom headers
app.use(customHeaders);

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
app.get("/", (req: Request, res: Response) => {
  res
    .status(httpStatus.OK)
    .send({ message: `e-dream.ai is running api at version ${version}` });
});

// register auth router
app.use("/api/v1/auth", authRouter);

app.all("*", (req, res) => {
  res.status(httpStatus.NOT_FOUND);
  if (req.accepts("json")) {
    res.json({ error: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorMiddleware);

// start express server
app.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
});
