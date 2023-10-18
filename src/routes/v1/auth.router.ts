import * as authController from "controllers/auth.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  confirmLoginWithCodeSchema,
  loginSchema,
  loginWithCodeSchema,
  signupSchema,
  verifySchema,
} from "schemas/auth.schema";

const authRouter = Router();

authRouter.post(
  "/login-with-code",
  validatorMiddleware(loginWithCodeSchema),
  authController.handleLoginWithCode,
);

authRouter.post(
  "/confirm-login-with-code",
  validatorMiddleware(confirmLoginWithCodeSchema),
  authController.handleConfirmLoginWithCode,
);

authRouter.post(
  "/signup",
  validatorMiddleware(signupSchema),
  authController.handleSignUp,
);

authRouter.post(
  "/code",
  validatorMiddleware(verifySchema),
  authController.handleVerifyCode,
);

authRouter.post(
  "/login",
  validatorMiddleware(loginSchema),
  authController.handleLogin,
);

authRouter.get("/user", requireAuth, authController.handleUser);

authRouter.post("/logout", authController.handleLogout);

authRouter.post("/refresh", authController.handleRefresh);

authRouter.post(
  "/change-password",
  requireAuth,
  authController.handleChangePassword,
);

authRouter.post("/forgot-password", authController.handleForgotPassword);

authRouter.post(
  "/confirm-forgot-password",
  authController.handleConfirmForgotPassword,
);

export default authRouter;
