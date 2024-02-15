import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Namespace } from "socket.io/dist/namespace";
import swaggerDocument from "constants/swagger.json";
import authMiddleware, {
  socketAuthMiddleware,
} from "middlewares/auth.middleware";
import env from "shared/env";
import swaggerUi from "swagger-ui-express";

export const registerMiddlewares = (app: express.Application) => {
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
};

export const socketRegisterMiddlewares = (namespace: Namespace) => {
  // auth middleware
  namespace.use(socketAuthMiddleware);
};
