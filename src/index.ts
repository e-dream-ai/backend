import cluster from "node:cluster";
import process from "node:process";
import { APP_LOGGER } from "shared/logger";
import Bugsnag from "@bugsnag/js";
import BugsnagPluginExpress from "@bugsnag/plugin-express";
import { getReleaseStage } from "utils/bugsnag.util";
import { ServerResources, shutdownServer, startServer } from "server";

Bugsnag.start({
  apiKey: "eb986254778e3ae5b0f7045ec7fdb9ec",
  plugins: [BugsnagPluginExpress],
  enabledReleaseStages: ["production", "development"],
  releaseStage: getReleaseStage(),
});

/**
 * Optimizing Node.js Application Concurrency
 * https://devcenter.heroku.com/articles/node-concurrency#tuning-the-concurrency-level
 */

// Calculate the number of workers based on available resources
const numOfWorkers =
  parseInt(process.env.HEROKU_AVAILABLE_PARALLELISM || "") || // for fir-based apps
  parseInt(process.env.WEB_CONCURRENCY || "") || // for cedar-based apps
  1;

if (cluster.isPrimary) {
  APP_LOGGER.info(`Primary ${process.pid} is running`);
  APP_LOGGER.info(`Starting ${numOfWorkers} workers`);

  // Fork workers
  for (let i = 0; i < numOfWorkers; i++) {
    cluster.fork();
  }

  // Handle worker events
  cluster.on("exit", (worker, code, signal) => {
    APP_LOGGER.error(
      `Worker ${worker.process.pid} died with code: ${code} and signal: ${signal}`,
    );
  });

  // Handle shutdown signals for primary process
  process.on("SIGTERM", () => {
    APP_LOGGER.info(`Primary ${process.pid} process received SIGTERM signal`);

    // Notify all workers to shut down gracefully
    for (const id in cluster.workers) {
      if (cluster.workers[id]) {
        cluster.workers[id]?.process.kill("SIGTERM");
      }
    }

    // Exit primary process after giving workers time to shut down
    setTimeout(() => {
      APP_LOGGER.info("Primary process exiting");
      process.exit(0);
    }, 5000);
  });
} else {
  // Worker process
  let serverResources: ServerResources | null = null;

  // Start the server
  startServer()
    .then((resources) => {
      serverResources = resources;
    })
    .catch((err) => {
      APP_LOGGER.error(`Worker ${process.pid}: Failed to start server:`, err);
      process.exit(1);
    });

  // Handle proper shutdown
  process.on("SIGTERM", async () => {
    APP_LOGGER.info(`Worker ${process.pid} received SIGTERM signal`);

    if (serverResources) {
      try {
        await shutdownServer(serverResources);
        APP_LOGGER.info(`Worker ${process.pid} shutdown complete`);
      } catch (err) {
        APP_LOGGER.error(`Worker ${process.pid} error during shutdown:`, err);
      }
    }

    process.exit(0);
  });
}
