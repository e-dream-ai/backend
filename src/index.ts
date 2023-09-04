require("dotenv/config");
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
// const swaggerUi = require('swagger-ui-express');
// import swaggerDoc from "./swagger";
import { json } from "body-parser";
import { PostgresService } from "./infra/postgres.service";
import { validateEnv } from "./shared/validateEnv";
import { APP_LOGGER } from "./shared/logger";

validateEnv();

const app: express.Application = express();
const port = process.env.PORT ?? 8080;
const version = process.env.npm_package_version;
const postgresService = new PostgresService();

const routes = [];

const customHeaders = (req: Request, res: Response, next: NextFunction) => {
  app.disable("x-powered-by");
  res.setHeader("X-Powered-By", `e-dream.ai ${version}`);
  next();
};

app.use(json());
app.use(cors());
app.use(customHeaders);

routes.push();

app.get("/", (req: Request, res: Response) => {
  res
    .status(200)
    .send({ message: `e-dream.ai is running api at version ${version}` });
});

app.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
  await postgresService.connect();
});
