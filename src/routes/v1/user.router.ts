import * as userController from "controllers/user.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateUserSchema } from "schemas/user.schema";

const userRouter = Router();

userRouter.get("/:id", requireAuth, userController.handleGetUser);

userRouter.put(
  "/:id",
  requireAuth,
  validatorMiddleware(updateUserSchema),
  userController.handleUpdateUser,
);

/**
 * Update avatar
 */
userRouter.put(
  "/:id/avatar",
  requireAuth,
  multerSingleFileMiddleware,
  userController.handleUpdateUserAvatar,
);

export default userRouter;
