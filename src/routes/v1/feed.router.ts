import * as feedController from "controllers/feed.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";

const feedRouter = Router();

feedRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  feedController.handleGetFeed,
);

feedRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  feedController.handleGetMyDreams,
);

export default feedRouter;
