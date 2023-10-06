import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { uploadMiddleware } from "middlewares/multer.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { createDreamSchema, updateDreamSchema } from "schemas/dream.schema";

const dreamRouter = Router();

dreamRouter.post(
  "/",
  uploadMiddleware.single("file"),
  validatorMiddleware(createDreamSchema),
  dreamController.handleCreateDream,
);

dreamRouter.put(
  "/:id",
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

export default dreamRouter;
