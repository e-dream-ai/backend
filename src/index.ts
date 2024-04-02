import http from "http";
import express from "express";
import { Server } from "socket.io";
import env from "shared/env";
import appDataSource from "database/app-data-source";
import { APP_LOGGER } from "shared/logger";
import {
  registerMiddlewares,
  socketRegisterMiddlewares,
} from "middlewares/middleware";
import { registerRoutes } from "routes/v1/router";
import { remoteControlConnectionListener } from "socket/remote-control";
import Bugsnag from "@bugsnag/js";
import BugsnagPluginExpress from "@bugsnag/plugin-express";
import { getReleaseStage } from "utils/bugsnag.util";

Bugsnag.start({
  apiKey: "eb986254778e3ae5b0f7045ec7fdb9ec",
  plugins: [BugsnagPluginExpress],
  enabledReleaseStages: ["production", "development"],
  releaseStage: getReleaseStage(),
});

const app: express.Application = express();
const bugsnagmiddleware = Bugsnag.getPlugin("express");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your client's origin
    methods: ["GET", "POST"],
  },
});
const port = env.PORT ?? 8080;
const version = env.npm_package_version;

/**
 * establish database connection
 */
appDataSource
  .initialize()
  .then(() => {
    APP_LOGGER.info("Connected with postgres");
  })
  .catch((err) => {
    APP_LOGGER.error("Error during postgres connection", err);
  });

if (env.NODE_ENV !== "development") {
  // This must be the first piece of middleware in the stack.
  // It can only capture errors in downstream middleware
  app.use(bugsnagmiddleware!.requestHandler);
}

/**
 * Register middlewares
 */
registerMiddlewares(app);

/**
 * Register routes
 */
registerRoutes(app);

const remoteControlNamespace = io.of("remote-control");

/**
 * Register socket middlewares
 */
socketRegisterMiddlewares(remoteControlNamespace);

/**
 * Register remote control connection listener
 */
remoteControlNamespace.on("connection", remoteControlConnectionListener);

if (env.NODE_ENV !== "development") {
  // This handles any errors that Express catches (TODO: replace above?)
  app.use(bugsnagmiddleware!.errorHandler);
}

// start express server
server.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
});
