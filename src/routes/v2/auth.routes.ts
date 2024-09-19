import { ROLES } from "constants/role.constants";
import * as authController from "controllers/auth.controller";
import * as userController from "controllers/user.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import {
  callbackSchemaV2,
  loginSchemaV2,
  magicSchemaV2,
  signupSchemaV2,
} from "schemas/auth.schema";

const authRouter = Router();

/**
 * @swagger
 * /user/authenticate:
 *  get:
 *    tags:
 *      - user
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
  userController.handleGetCurrentUser,
);

/**
 * @swagger
 * /auth/callback:
 *  get:
 *    tags:
 *      - auth
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
 * /auth/magic:
 *  post:
 *    tags:
 *      - auth
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
 * /auth/magic:
 *  post:
 *    tags:
 *      - auth
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
 * /auth/logout:
 *  post:
 *    tags:
 *      - auth
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
authRouter.get("/logout", authController.logout);

/**
 * @swagger
 * /auth/refresh:
 *  post:
 *    tags:
 *      - auth
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

export default authRouter;
