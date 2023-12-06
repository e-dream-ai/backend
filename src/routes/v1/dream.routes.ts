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
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleGetDreams,
);

dreamRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  multerSingleFileMiddleware,
  dreamController.handleCreateDream,
);

dreamRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleGetMyDreams,
);

dreamRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleGetDream,
);

dreamRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

dreamRouter.put(
  "/:uuid/video",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  multerSingleFileMiddleware,
  dreamController.handleUpdateVideoDream,
);

dreamRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  multerSingleFileMiddleware,
  dreamController.handleUpdateThumbnailDream,
);

dreamRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleDeleteDream,
);

dreamRouter.put(
  "/:uuid/upvote",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleUpvoteDream,
);

dreamRouter.put(
  "/:uuid/downvote",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  dreamController.handleDownvoteDream,
);

export default dreamRouter;
