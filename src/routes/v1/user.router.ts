import { ROLES } from "constants/role.constants";
import * as userController from "controllers/user.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateUserRoleSchema, updateUserSchema } from "schemas/user.schema";

const userRouter = Router();

userRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  userController.handleGetUsers,
);

userRouter.get(
  "/:id",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  userController.handleGetUser,
);

userRouter.put(
  "/:id",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateUserSchema),
  userController.handleUpdateUser,
);

/**
 * Update avatar
 */
userRouter.put(
  "/:id/avatar",
  requireAuth,
  checkRoleMiddleware([ROLES.USER_GROUP, ROLES.ADMIN_GROUP]),
  multerSingleFileMiddleware,
  userController.handleUpdateUserAvatar,
);

/**
 * Update avatar
 */
userRouter.put(
  "/:id/role",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateUserRoleSchema),
  userController.handleUpdateRole,
);

export default userRouter;
