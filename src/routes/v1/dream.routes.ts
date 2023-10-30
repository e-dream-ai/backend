import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateDreamSchema } from "schemas/dream.schema";

const dreamRouter = Router();

dreamRouter.get("/", requireAuth, dreamController.handleGetDreams);

dreamRouter.post(
  "/",
  requireAuth,
  multerSingleFileMiddleware,
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
  multerSingleFileMiddleware,
  dreamController.handleUpdateVideoDream,
);

dreamRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  multerSingleFileMiddleware,
  dreamController.handleUpdateThumbnailDream,
);

dreamRouter.delete("/:uuid", requireAuth, dreamController.handleDeleteDream);

export default dreamRouter;
