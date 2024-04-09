import { ROLES } from "constants/role.constants";
import * as feedController from "controllers/feed.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { feedSchema } from "schemas/feed.schema";

const feedRouter = Router();

feedRouter.get(
  "/ranked",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  feedController.handleGetRankedFeed,
);

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
  validatorMiddleware(feedSchema),
  feedController.handleGetMyDreams,
);

export default feedRouter;
