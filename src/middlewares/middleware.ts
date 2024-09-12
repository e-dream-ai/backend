import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import { Namespace } from "socket.io/dist/namespace";
import { socketAuthMiddleware } from "middlewares/socket.middleware";
import env from "shared/env";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import { APP_LOGGER } from "shared/logger";
import passport from "passport";
import session from "express-session";
import configurePassport from "clients/passport.client";
import cookieParser from "cookie-parser";

const swaggerPath = "/api/v1/api-docs";

configurePassport();

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

  // parse cookies
  app.use(cookieParser());

  // parse json request body
  app.use(bodyParser.json());

  // cors middleware
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
      ],
    }),
  );

  // parse urlencoded request body
  app.use(express.urlencoded({ extended: true }));

  // custom headers
  app.use(customHeaders);

  // pino-http express middleware
  app.use(pinoHttp({ logger: APP_LOGGER }));

  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // swagger ui

  // Serve Swagger UI
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export const socketRegisterMiddlewares = (namespace: Namespace) => {
  // auth middleware
  namespace.use(socketAuthMiddleware);
};
