import { ROLES } from "constants/role.constants";
import * as feedController from "controllers/feed.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";

const feedRouter = Router();

feedRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  feedController.handleGetFeed,
);

feedRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  feedController.handleGetMyDreams,
);

export default feedRouter;
