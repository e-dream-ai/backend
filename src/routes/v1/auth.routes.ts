import * as authController from "controllers/auth.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  confirmLoginWithCodeSchema,
  loginSchema,
  loginWithCodeSchema,
  validateSignupSchema,
  verifySchema,
} from "schemas/auth.schema";

const authRouter = Router();

/**
 * /auth/login-with-code:
 *  post:
 *    tags:
 *      - auth
 *    summary: Login user with code request
 *    description: Handles the login with code request
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                format: email
 *    responses:
 *      '200':
 *        description: Code sent to email
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - properties:
 *                    data:
 *                      type: object
 *                      properties:
 *                        session:
 *                          type: string
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/login-with-code",
  validatorMiddleware(loginWithCodeSchema),
  authController.handleLoginWithCode,
);

/**
 * /auth/confirm-login-with-code:
 *  post:
 *    tags:
 *      - auth
 *    summary: Login user with code
 *    description: Handles the login with code
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                format: email
 *              code:
 *                type: string
 *              session:
 *                type: string
 *    responses:
 *      '200':
 *        description: User logged in successfully
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - properties:
 *                    data:
 *                      $ref: '#/components/schemas/UserWithToken'
 *                      type: object
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/confirm-login-with-code",
  validatorMiddleware(confirmLoginWithCodeSchema),
  authController.handleConfirmLoginWithCode,
);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags:
 *       - auth
 *     summary: Signup user
 *     description: Handles the signup
 *     requestBody:
 *       description: Signup object
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 format: email
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post("/signup", validateSignupSchema, authController.handleSignUp);

/**
 * @swagger
 * /auth/code:
 *  post:
 *     tags:
 *       - auth
 *     summary: Verify email
 *     description: Handles verify email
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/code",
  validatorMiddleware(verifySchema),
  authController.handleVerifyCode,
);

/**
 * @swagger
 * /auth/login:
 *    post:
 *      tags:
 *        - auth
 *      summary: Login user
 *      description: Handles the login
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                  format: email
 *                password:
 *                  type: string
 *                  format: password
 *      responses:
 *        '200':
 *          description: User logged in successfully
 *          content:
 *            application/json:
 *              schema:
 *                allOf:
 *                  - $ref: '#/components/schemas/ApiResponse'
 *                  - properties:
 *                      data:
 *                        $ref: '#/components/schemas/UserWithToken'
 *                        type: object
 *        '400':
 *          description: Bad request
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/login",
  validatorMiddleware(loginSchema),
  authController.handleLogin,
);

// Custom callback for handling JSON
authRouter.post("/passport-login", authController.handlePassportLogin);

/**
 * @swagger
 * /auth/user:
 *  get:
 *    tags:
 *      - auth
 *    summary: Gets current user
 *    description: Handles current user
 *    responses:
 *      '200':
 *        description: User logged in successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              $ref: '#/components/schemas/ApiResponse'
 *              properties:
 *                data:
 *                  type: object
 *                  properties:
 *                    user:
 *                      type: object
 *                      $ref: '#/components/schemas/User'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
authRouter.get("/user", requireAuth, authController.handleUser);

/**
 * @swagger
 * /auth/logout:
 *  post:
 *    tags:
 *      - auth
 *    summary: Logout user
 *    description: Handles the logout
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              refreshToken:
 *                type: string
 *    responses:
 *      '200':
 *        description: User logged out successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post("/logout", authController.handleLogout);

/**
 * @swagger
 * /auth/refresh:
 *  post:
 *    tags:
 *      - auth
 *    summary: Refresh token
 *    description: Handles refresh token
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              refreshToken:
 *                type: string
 *    responses:
 *      '200':
 *        description: User logged in successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *              properties:
 *                data:
 *                  $ref: '#/components/schemas/Tokens'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post("/refresh", authController.handleRefresh);

/**
 * @swagger
 * /auth/change-password:
 *  post:
 *    tags:
 *      - auth
 *    summary: Change password
 *    description: Handles change password
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              previousPassword:
 *                type: string
 *                format: password
 *              proposedPassword:
 *                type: string
 *                format: password
 *    responses:
 *      '200':
 *        description: User password changed successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
authRouter.post(
  "/change-password",
  requireAuth,
  authController.handleChangePassword,
);

/**
 * /auth/forgot-password:
 *  post:
 *    tags:
 *      - auth
 *    summary: Forgot password request
 *    description: Handles forgot password
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                format: email
 *    responses:
 *      '200':
 *        description: Forgot password request successfully created
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post("/forgot-password", authController.handleForgotPassword);

/**
 * @swagger
 * /auth/confirm-forgot-password:
 *  post:
 *    tags:
 *      - auth
 *    summary: Confirm forgot password
 *    description: Handles confirm forgot password
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                format: email
 *              code:
 *                type: string
 *                format: password
 *              password:
 *                type: string
 *                format: password
 *    responses:
 *      '200':
 *        description: User password changed successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/confirm-forgot-password",
  authController.handleConfirmForgotPassword,
);

export default authRouter;
