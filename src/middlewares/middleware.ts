import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Namespace } from "socket.io/dist/namespace";
// import swaggerDocument from "constants/swagger.json";
import authMiddleware from "middlewares/auth.middleware";
import { socketAuthMiddleware } from "middlewares/socket.middleware";
import env from "shared/env";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

const swaggerPath = "/api/v1/api-docs";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "edream api 1.0",
      version: "1.0",
      description: "This is the edream api specification.",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT ?? 8080}/api/v1/`,
      },
      {
        url: "https://e-dream-76c98b08cc5d.herokuapp.com/api/v1/",
      },
    ],
  },
  apis: ["./src/routes/v1/*.routes.ts", "./src/routes/v1/router.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export const registerMiddlewares = (app: express.Application) => {
  const version = env.npm_package_version;

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

  // Serve Swagger UI
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // app.use(swaggerPath, swaggerUi.serve);
  // app.get(swaggerPath, swaggerUi.setup(swaggerDocument));
};

export const socketRegisterMiddlewares = (namespace: Namespace) => {
  // auth middleware
  namespace.use(socketAuthMiddleware);
};
