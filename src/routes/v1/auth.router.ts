import * as authController from "controller/auth.controller";
import { Router } from "express";
import validator from "middlewares/validator.middleware";
import { loginSchema, signupSchema } from "schemas/auth.schema";

const authRouter = Router();

authRouter.post(
  "/signup",
  validator(signupSchema),
  authController.handleSignUp,
);

authRouter.post("/login", validator(loginSchema), authController.handleLogin);

authRouter.post("/logout", authController.handleLogout);

authRouter.post("/refresh", authController.handleRefresh);

export default authRouter;
