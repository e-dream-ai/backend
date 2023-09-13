import * as authController from "controllers/auth.controller";
import { Router } from "express";
import validator from "middlewares/validator.middleware";
import { loginSchema, signupSchema, verifySchema } from "schemas/auth.schema";

const authRouter = Router();

authRouter.post(
  "/signup",
  validator(signupSchema),
  authController.handleSignUp,
);

authRouter.post(
  "/code",
  validator(verifySchema),
  authController.handleVerifyCode,
);

authRouter.post("/login", validator(loginSchema), authController.handleLogin);

authRouter.post("/logout", authController.handleLogout);

authRouter.post("/refresh", authController.handleRefresh);

export default authRouter;
