import { ROLES } from "constants/role.constants";
import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateDreamSchema } from "schemas/dream.schema";

const dreamRouter = Router();

dreamRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleGetDreams,
);

dreamRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  multerSingleFileMiddleware,
  dreamController.handleCreateDream,
);

dreamRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleGetMyDreams,
);

dreamRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleGetDream,
);

dreamRouter.post(
  "/:uuid/process-dream",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleProcessDream,
);

dreamRouter.post(
  "/:uuid/status/processing",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleSetDreamStatusProcessing,
);

dreamRouter.post(
  "/:uuid/status/processed",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleSetDreamStatusProcessed,
);

dreamRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

dreamRouter.put(
  "/:uuid/video",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  multerSingleFileMiddleware,
  dreamController.handleUpdateVideoDream,
);

dreamRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  multerSingleFileMiddleware,
  dreamController.handleUpdateThumbnailDream,
);

dreamRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleDeleteDream,
);

dreamRouter.put(
  "/:uuid/upvote",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleUpvoteDream,
);

dreamRouter.put(
  "/:uuid/downvote",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  dreamController.handleDownvoteDream,
);

export default dreamRouter;
