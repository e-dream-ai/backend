import http from "http";
import express from "express";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
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
import { ALLOWED_HEADERS, ALLOWED_METHODS } from "constants/socket.constants";
import { handleCustomOrigin } from "utils/api.util";
import { redisClient } from "clients/redis.client";
import { setSocketInstance } from "services/socket.service";

export type ServerResources = {
  app: express.Application;
  server: http.Server;
  io: Server;
  pubClient: Redis;
  subClient: Redis;
};

/**
 * Initialize and start the server with all required resources (app, server, io server and redis clients)
 * @returns Promise that resolves when server is listening
 */
export async function startServer(): Promise<ServerResources> {
  // Initialize express app
  const app: express.Application = express();
  const server = http.createServer(app);
  const port = env.PORT ?? 8080;
  const version = env.npm_package_version;

  // Create Redis clients for Socket.IO adapter
  const pubClient = redisClient;
  const subClient = redisClient.duplicate();

  // Initialize Socket.IO with Redis adapter
  const io = new Server(server, {
    cors: {
      // Cors callback function
      origin: handleCustomOrigin,
      credentials: true,
      methods: ALLOWED_METHODS,
      allowedHeaders: ALLOWED_HEADERS,
    },
    adapter: createAdapter(pubClient, subClient),
  });

  // Database connection
  try {
    await appDataSource.initialize();
    APP_LOGGER.info(`Worker ${process.pid}: Connected with postgres`);
  } catch (err) {
    APP_LOGGER.error(`Worker ${process.pid}: Database connection error:`, err);
    throw err;
  }

  // Set up express app
  configureApp(app, io);

  // Start express server
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      APP_LOGGER.info(
        `Worker ${process.pid}: e-dream.ai api ${version} started on port ${port}`,
      );
      resolve();
    });
  });

  return { app, server, io, pubClient, subClient };
}

/**
 * Configure express app with middlewares, routes and socket handlers
 */
function configureApp(app: express.Application, io: Server) {
  const bugsnagMiddleware = Bugsnag.getPlugin("express");

  if (env.NODE_ENV !== "development") {
    // This must be the first middleware in the stack
    // It can only capture errors in downstream middleware
    app.use(bugsnagMiddleware!.requestHandler);
  }

  // Register middlewares
  registerMiddlewares(app);

  // Register routes
  registerRoutes(app);

  // Set up Socket.IO namespaces and handlers
  const remoteControlNamespace = io.of("remote-control");

  // Initialize global socket service
  setSocketInstance(io);

  // Set up connection handler to test
  remoteControlNamespace.on("connection", (socket) => {
    const clientId = socket.id;

    APP_LOGGER.info(`Worker ${process.pid}: New client connected: ${clientId}`);

    // Handle disconnect
    remoteControlNamespace.on("disconnect", () => {
      APP_LOGGER.info(
        `Worker ${process.pid}: Client disconnected: ${clientId}`,
      );
    });
  });

  socketRegisterMiddlewares(remoteControlNamespace);
  remoteControlNamespace.on("connection", remoteControlConnectionListener);

  if (env.NODE_ENV !== "development") {
    // Error handler - must be last
    app.use(bugsnagMiddleware!.errorHandler);
  }
}

/**
 * Properly shut down all server resources
 */
export async function shutdownServer(
  resources: ServerResources,
): Promise<void> {
  const { server, io, pubClient, subClient } = resources;

  // Close the HTTP server
  await new Promise<void>((resolve) => {
    server.close(() => {
      APP_LOGGER.info(`Worker ${process.pid}: HTTP server closed`);
      resolve();
    });
  });

  // Close Socket.IO connections
  await new Promise<void>((resolve) => {
    io.close(() => {
      APP_LOGGER.info(`Worker ${process.pid}: Socket.IO server closed`);
      resolve();
    });
  });

  // Close Redis connections
  await Promise.all([pubClient.quit(), subClient.quit()]);
  APP_LOGGER.info(`Worker ${process.pid}: Redis connections closed`);

  // Close database connection
  await appDataSource.destroy();
  APP_LOGGER.info(`Worker ${process.pid}: Database connection closed`);
}
