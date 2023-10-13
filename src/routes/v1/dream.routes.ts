import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { uploadMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateDreamSchema } from "schemas/dream.schema";

const dreamRouter = Router();

dreamRouter.post(
  "/",
  requireAuth,
  uploadMiddleware.single("file"),
  dreamController.handleCreateDream,
);

dreamRouter.get("/my-dreams", requireAuth, dreamController.handleGetMyDreams);

dreamRouter.get("/:uuid", requireAuth, dreamController.handleGetDream);

dreamRouter.put(
  "/:uuid",
  requireAuth,
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

dreamRouter.put(
  "/:uuid/video",
  requireAuth,
  uploadMiddleware.single("file"),
  dreamController.handleUpdateVideoDream,
);

dreamRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  uploadMiddleware.single("file"),
  dreamController.handleUpdateThumbnailDream,
);

export default dreamRouter;
