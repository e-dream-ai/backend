import { ROLES } from "constants/role.constants";
import * as userController from "controllers/user.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  getUsersSchema,
  requestUserSchema,
  requestVotedDreamsSchema,
  updateUserRoleSchema,
  validateUserSchema,
} from "schemas/user.schema";

const userRouter = Router();

/**
 * @swagger
 * /user/me/playlist:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets authenticated user playlist
 *    description: Gets authenticated user playlist
 *    responses:
 *      '200':
 *        description: Gets authenticated user playlist
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
 *                        playlist:
 *                          $ref: '#/components/schemas/Playlist'
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
userRouter.get(
  "/me/playlist",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  userController.handleGetAuthenticatedUserPlaylist,
);

/**
 * @swagger
 * /user/me/dislikes:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets authenticated user disliked dreams
 *    description: Gets authenticated user disliked dreams
 *    responses:
 *      '200':
 *        description: Gets authenticated user disliked dreams
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
 *                          dislikes:
 *                            type: array
 *                            items: string
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
userRouter.get(
  "/me/dislikes",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  userController.handleGetUserDislikes,
);

/**
 * @swagger
 * /user/me:
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
userRouter.get(
  "/me",
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
 * /user/roles:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets user roles
 *    description: Gets user roles
 *    parameters:
 *      - name: take
 *        in: query
 *        description: Number of items to take
 *        required: false
 *        schema:
 *          type: integer
 *          example: 1
 *      - name: skip
 *        in: query
 *        description: Number of items to skip
 *        required: false
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Gets user roles
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
 *                        count:
 *                          type: number
 *                        roles:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Role'
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
userRouter.get(
  "/roles",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  userController.handleGetRoles,
);

/**
 * @swagger
 * /user/{uuid}/votes:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets user dreams voted
 *    description: Gets user dreams voted
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets user dreams voted
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
 *                  properties:
 *                    data:
 *                      type: array
 *                      properties:
 *                        dreams:
 *                          $ref: '#/components/schemas/Dream'
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
userRouter.get(
  "/:uuid/votes",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestVotedDreamsSchema),
  userController.handleGetVotedDreams,
);

/**
 * @swagger
 * /user/{uuid}:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets user
 *    description: Gets user
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets user
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
 *                          $ref: '#/components/schemas/User'
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
userRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestUserSchema),
  userController.handleGetUser,
);

/**
 * @swagger
 * /user:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets users
 *    description: Gets users
 *    responses:
 *      '200':
 *        description: Gets users
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
 *                        users:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/User'
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
userRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getUsersSchema),
  userController.handleGetUsers,
);

/**
 * @swagger
 * /user/{uuid}:
 *  put:
 *    tags:
 *      - user
 *    summary: Updates user
 *    description: Updates user
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/User'
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Saves user avatar
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
 *                          $ref: '#/components/schemas/User'
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
userRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestUserSchema),
  validateUserSchema,
  userController.handleUpdateUser,
);

/**
 * @swagger
 * /user/{uuid}/avatar:
 *  put:
 *    tags:
 *      - user
 *    summary: Updates user avatar
 *    description: Updates user avatar
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              file:
 *                type: string
 *                format: binary
 *                description: The file to upload
 *    responses:
 *      '200':
 *        description: Saves user avatar
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
 *                          $ref: '#/components/schemas/User'
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
userRouter.put(
  "/:uuid/avatar",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  multerSingleFileMiddleware,
  validatorMiddleware(requestUserSchema),
  userController.handleUpdateUserAvatar,
);

/**
 * @swagger
 * /user/{uuid}/role:
 *  put:
 *    tags:
 *      - user
 *    summary: Updates user role
 *    description: Updates user role
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              role:
 *                type: number
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Saves user role
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
 *                          $ref: '#/components/schemas/User'
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
userRouter.put(
  "/:uuid/role",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateUserRoleSchema),
  userController.handleUpdateRole,
);

/**
 * @swagger
 * /user/{uuid}/apikey:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets user api key
 *    description: Gets user api key
 *    parameters:
 *      - name: id
 *        in: query
 *        description: User id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Gets user api key
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
 *                        apikey:
 *                          type: object
 *                          properties:
 *                            apikey:
 *                              type: string
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
userRouter.get(
  "/:uuid/apikey",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestUserSchema),
  userController.handleGetApiKey,
);

/**
 * @swagger
 * /user/{uuid}/apikey:
 *  put:
 *    tags:
 *      - user
 *    summary: Generates user api key
 *    description: Generates user api key
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Generates user api key
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
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
userRouter.put(
  "/:uuid/apikey",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestUserSchema),
  userController.handleGenerateApiKey,
);

/**
 * @swagger
 * /user/{uuid}/apikey:
 *  delete:
 *    tags:
 *      - user
 *    summary: Revokes user api key
 *    description: Revokes user api key
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: User uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Revokes user api key
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
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
userRouter.delete(
  "/:uuid/apikey",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(requestUserSchema),
  userController.handleRevokeApiKey,
);

export default userRouter;
