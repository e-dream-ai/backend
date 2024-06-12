import { ROLES } from "constants/role.constants";
import * as userController from "controllers/user.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  getUsersSchema,
  updateUserRoleSchema,
  updateUserSchema,
} from "schemas/user.schema";

const userRouter = Router();

/**
 * @swagger
 * /user/current/playlist:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets current user playlist
 *    description: Gets current user playlist
 *    responses:
 *      '200':
 *        description: Gets current user playlist
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
 */
userRouter.get(
  "/current/playlist",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  userController.handleGetCurrentPlaylist,
);

/**
 * @swagger
 * /user/current:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets current user dream
 *    description: Gets current user dream
 *    responses:
 *      '200':
 *        description: Gets current user dream
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
 *                        dream:
 *                          $ref: '#/components/schemas/Dream'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
userRouter.get(
  "/current",
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
 * /user/{id}:
 *  get:
 *    tags:
 *      - user
 *    summary: Gets user
 *    description: Gets user
 *    parameters:
 *      - name: id
 *        in: path
 *        description: User id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
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
 */
userRouter.get(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
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
 * /user/{id}:
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
 *      - name: id
 *        in: query
 *        description: User id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
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
 */
userRouter.put(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updateUserSchema),
  userController.handleUpdateUser,
);

/**
 * @swagger
 * /user/{id}/avatar:
 *  put:
 *    tags:
 *      - user
 *    summary: Updates user avatar
 *    description: Updates user avatar
 *    parameters:
 *      - name: id
 *        in: query
 *        description: User id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
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
 */
userRouter.put(
  "/:id/avatar",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  multerSingleFileMiddleware,
  userController.handleUpdateUserAvatar,
);

/**
 * @swagger
 * /user/{id}/role:
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
 *      - name: id
 *        in: query
 *        description: User id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
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
 */
userRouter.put(
  "/:id/role",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateUserRoleSchema),
  userController.handleUpdateRole,
);

export default userRouter;
