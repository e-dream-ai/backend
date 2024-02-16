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

const app: express.Application = express();
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
    console.error(err);
  });

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

// start express server
server.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
});
