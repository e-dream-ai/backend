import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { uploadMiddleware } from "middlewares/multer.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateDreamSchema } from "schemas/dream.schema";

const dreamRouter = Router();

dreamRouter.post(
  "/",
  uploadMiddleware.single("file"),
  dreamController.handleCreateDream,
);

dreamRouter.put(
  "/:id",
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

dreamRouter.put("/:id/video", dreamController.handleUpdateVideoDream);

dreamRouter.put("/:id/thumbnail", dreamController.handleThumbnailDream);

export default dreamRouter;
