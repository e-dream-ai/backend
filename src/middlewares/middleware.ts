import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import { Namespace } from "socket.io/dist/namespace";
import {
  socketAuthMiddleware,
  socketCookieParserMiddleware,
  socketWorkOSAuth,
} from "middlewares/socket.middleware";
import env from "shared/env";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import passport from "passport";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { redisClient } from "clients/redis.client";
import configurePassport from "clients/passport.client";
import cookieParser from "cookie-parser";
import { handleCustomOrigin } from "utils/api.util";
import { ALLOWED_HEADERS, ALLOWED_METHODS } from "constants/api.constants";
import {
  requestContextMiddleware,
  socketRequestContextMiddleware,
} from "./request-context-middleware";
import { requestLogger } from "./request-logger.middleware";
import { memoryMonitorMiddleware } from "./memory-monitor.middleware";
import { workOSCookieConfig } from "utils/workos.util";

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
      // Cors callback function
      origin: handleCustomOrigin,
      credentials: true,
      methods: ALLOWED_METHODS,
      allowedHeaders: ALLOWED_HEADERS,
    }),
  );

  // parse urlencoded request body
  app.use(express.urlencoded({ extended: true }));

  // custom headers
  app.use(customHeaders);

  app.use(memoryMonitorMiddleware);

  // pino-http express middleware
  app.use(pinoHttp());

  app.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: workOSCookieConfig,
    }),
  );

  app.use(requestContextMiddleware);

  app.use(requestLogger);

  app.use(passport.initialize());
  app.use(passport.session());

  // Serve Swagger UI
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export const socketRegisterMiddlewares = (namespace: Namespace) => {
  // auth middleware
  namespace.use(socketCookieParserMiddleware);
  namespace.use(socketRequestContextMiddleware);
  namespace.use(socketAuthMiddleware);
  namespace.use(socketWorkOSAuth);
};
