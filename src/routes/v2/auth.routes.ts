import { ROLES } from "constants/role.constants";
import * as authController from "controllers/auth.controller";
import * as userController from "controllers/user.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import {
  callbackSchemaV2,
  createPasswordResetV2,
  loginSchemaV2,
  magicSchemaV2,
  signupSchemaV2,
} from "schemas/auth.schema";

const authRouter = Router();

/**
 * @swagger
 * /api/v2/auth/authenticate:
 *  get:
 *    tags:
 *      - auth-v2
 *    summary: Gets authenticated user
 *    description: Gets authenticated user
 *    responses:
 *      '200':
 *        description: Gets authenticated user
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
 *                  properties:
 *                    data:
 *                      type: object
 *                      properties:
 *                        user:
 *                          $ref: '#/components/schemas/Users'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
authRouter.get(
  "/authenticate",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  userController.handleGetAuthenticatedUser,
);

/**
 * @swagger
 * /api/v2/auth/callback:
 *  get:
 *    tags:
 *      - auth-v2
 *    summary: Receives callbacks from workos
 *    description: Handles the callback and returns auth headers and sets cookies
 *    parameters:
 *      - name: code
 *        in: query
 *        description: workos callback token
 *        required: true
 *        schema:
 *          type: string
 *          example: 01J75HBA4QATM952T7RSZQH60Q
 *    responses:
 *      '200':
 *        description: User logged in successfully
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
authRouter.get(
  "/callback",
  validatorMiddleware(callbackSchemaV2),
  authController.handleWorkOSCallback,
);

/**
 * @swagger
 * /api/v2/auth/login:
 *  post:
 *    tags:
 *      - auth-v2
 *    summary: Login user with email and password
 *    description: Handles login.
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *                required: true
 *              password:
 *                type: string
 *                required: true
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
 *                        user:
 *                          type: object
 *                        sealedSession:
 *                          type: string
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/login",
  validatorMiddleware(loginSchemaV2),
  authController.loginWithPassword,
);

/**
 * @swagger
 * /api/v2/auth/magic:
 *  post:
 *    tags:
 *      - auth-v2
 *    summary: Login user with magic code sent to email.
 *    description: Handles login with code. If no code is provided, sends an email with code.
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                format: email
 *                required: true
 *              code:
 *                type: string
 *                required: false
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
 *                        user:
 *                          type: object
 *                        sealedSession:
 *                          type: string
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
authRouter.post(
  "/magic",
  validatorMiddleware(magicSchemaV2),
  authController.loginWithMagicAuth,
);

/**
 * @swagger
 * /api/v2/auth/logout:
 *  get:
 *    tags:
 *      - auth-v2
 *    summary: Logout user
 *    description: Handles the logout
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
authRouter.get("/logout", requireAuth, authController.logout);

/**
 * @swagger
 * /api/v2/auth/refresh:
 *  post:
 *    tags:
 *      - auth-v2
 *    summary: Refresh token
 *    description: Handles refresh token passed in via cookie or headers.
 *    responses:
 *      '200':
 *        description: Token refreshed successfully
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
authRouter.post("/refresh", authController.refreshWorkOS);

/**
 * @swagger
 * /api/v2/auth/signup:
 *   post:
 *     tags:
 *       - auth-v2
 *     summary: Signup user
 *     description: Handles the signup
 *     requestBody:
 *       description: Signup object
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               code:
 *                 type: string
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
authRouter.post(
  "/signup",
  validatorMiddleware(signupSchemaV2),
  authController.handleSignUpV2,
);

/**
 * @swagger
 * /api/v2/auth/create-password-reset:
 *   post:
 *     tags:
 *       - auth-v2
 *     summary: Create password reset
 *     description: Create password reset
 *     requestBody:
 *       description: Password reset obj
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: Password reset created successfully
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
  "/create-password-reset",
  validatorMiddleware(createPasswordResetV2),
  authController.handleCreatePasswordReset,
);

/**
 * @swagger
 * /api/v2/auth/user:
 *  get:
 *    tags:
 *      - auth-v2
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
 *      - apiKeyAuth: []
 */
authRouter.get("/user", requireAuth, authController.handleUser);

/**
 * @swagger
 * /api/v2/auth/dream/current:
 *  get:
 *    tags:
 *      - auth-v2
 *    summary: Gets current dream
 *    description: Handles current dream
 *    responses:
 *      '200':
 *        description: Current dream returned successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              $ref: '#/components/schemas/ApiResponse'
 *              properties:
 *                data:
 *                  type: object
 *                  properties:
 *                    dream:
 *                      type: object
 *                      $ref: '#/components/schemas/Dream'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
authRouter.get(
  "/dream/current",
  requireAuth,
  authController.handleCurrentUserDream,
);

/**
 * @swagger
 * /api/v2/auth/playlist/current:
 *  get:
 *    tags:
 *      - auth-v2
 *    summary: Gets current playlist
 *    description: Handles current playlist
 *    responses:
 *      '200':
 *        description: Current playlist returned successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              $ref: '#/components/schemas/ApiResponse'
 *              properties:
 *                data:
 *                  type: object
 *                  properties:
 *                    playlist:
 *                      type: object
 *                      $ref: '#/components/schemas/Playlist'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
authRouter.get(
  "/playlist/current",
  requireAuth,
  authController.handleCurrentUserPlaylist,
);

export default authRouter;
