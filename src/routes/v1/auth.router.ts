import * as authController from "controllers/auth.controller";
import { Router } from "express";
import validatorMiddleware from "middlewares/validator.middleware";
import { loginSchema, signupSchema, verifySchema } from "schemas/auth.schema";

const authRouter = Router();

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

authRouter.get("/current-user", authController.handleLogout);

authRouter.post("/logout", authController.handleLogout);

authRouter.post("/refresh", authController.handleRefresh);

export default authRouter;
