import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import * as userApiEndpointController from "controllers/user-api-endpoint.controller";
import {
  createUserApiEndpointSchema,
  endpointParamsSchema,
  updateUserApiEndpointSchema,
} from "schemas/user-api-endpoint.schema";

const userApiEndpointRouter = Router();

userApiEndpointRouter.get(
  "/",
  requireAuth,
  userApiEndpointController.handleListEndpoints,
);
userApiEndpointRouter.post(
  "/",
  requireAuth,
  validatorMiddleware(createUserApiEndpointSchema),
  userApiEndpointController.handleCreateEndpoint,
);
userApiEndpointRouter.put(
  "/:uuid",
  requireAuth,
  validatorMiddleware(updateUserApiEndpointSchema),
  userApiEndpointController.handleUpdateEndpoint,
);
userApiEndpointRouter.delete(
  "/:uuid",
  requireAuth,
  validatorMiddleware(endpointParamsSchema),
  userApiEndpointController.handleDeleteEndpoint,
);
userApiEndpointRouter.post(
  "/:uuid/test",
  requireAuth,
  validatorMiddleware(endpointParamsSchema),
  userApiEndpointController.handleTestEndpoint,
);

export default userApiEndpointRouter;
