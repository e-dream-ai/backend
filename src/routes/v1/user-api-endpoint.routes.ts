import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import * as userApiEndpointController from "controllers/user-api-endpoint.controller";

const userApiEndpointRouter = Router();

userApiEndpointRouter.get(
  "/",
  requireAuth,
  userApiEndpointController.handleListEndpoints,
);
userApiEndpointRouter.post(
  "/",
  requireAuth,
  userApiEndpointController.handleCreateEndpoint,
);
userApiEndpointRouter.put(
  "/:uuid",
  requireAuth,
  userApiEndpointController.handleUpdateEndpoint,
);
userApiEndpointRouter.delete(
  "/:uuid",
  requireAuth,
  userApiEndpointController.handleDeleteEndpoint,
);
userApiEndpointRouter.post(
  "/:uuid/test",
  requireAuth,
  userApiEndpointController.handleTestEndpoint,
);

export default userApiEndpointRouter;
