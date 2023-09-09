require("dotenv/config");
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { json } from "body-parser";
import { validateEnv } from "./shared/validateEnv";
import { APP_LOGGER } from "./shared/logger";
import { Counter } from "./entity/Counter.entity";
import appDataSource from "./database/app-data-source";

validateEnv();
const app: express.Application = express();
const port = process.env.PORT ?? 8080;
const version = process.env.npm_package_version;

const customHeaders = (req: Request, res: Response, next: NextFunction) => {
  app.disable("x-powered-by");
  res.setHeader("X-Powered-By", `e-dream.ai ${version}`);
  next();
};

app.use(json());
app.use(cors());
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

// register routes
app.get("/", (req: Request, res: Response) => {
  res
    .status(200)
    .send({ message: `e-dream.ai is running api at version ${version}` });
});

app.get("/counter", async (req: Request, res: Response) => {
  const counterRepository = appDataSource.getRepository(Counter);

  let counter = await counterRepository.findOneBy({
    key: "general-conter",
  });

  if (!counter) {
    counter = new Counter();
    counter.key = "general-conter";
    counter.value = 1;
    await counterRepository.save(counter);
  }

  res.status(200).send({ counter: counter.value });
});

app.post("/counter", async (req: Request, res: Response) => {
  const counterRepository = appDataSource.getRepository(Counter);

  let counter = await counterRepository.findOneBy({
    key: "general-conter",
  });

  if (!counter) {
    counter = new Counter();
    counter.key = "general-conter";
    counter.value = 1;
  } else {
    counter.value += 1;
  }

  await counterRepository.save(counter);

  res.status(200).send({ counter: counter.value });
});

// start express server
app.listen(port, async () => {
  APP_LOGGER.info(`e-dream.ai api ${version} started on port ${port}`);
});
