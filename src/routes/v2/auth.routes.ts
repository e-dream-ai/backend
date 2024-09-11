import * as authController from "controllers/auth.controller";
import { Router } from "express";

const authRouter = Router();

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
authRouter.get("/callback", authController.handleWorkOSCallback);

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
authRouter.post("/login", authController.loginWithPassword);

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
 *                type: number
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
authRouter.post("/magic", authController.loginWithMagicAuth);

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
authRouter.post("/logout", authController.logout);

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

export default authRouter;
