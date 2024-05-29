import { ROLES } from "constants/role.constants";
import * as playlistController from "controllers/playlist.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  addPlaylistItemSchema,
  createPlaylistSchema,
  orderPlaylistSchema,
  updatePlaylistSchema,
} from "schemas/playlist.schema";
const playlistRouter = Router();

/**
 * @swagger
 * /playlist/{id}:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets playlist
 *    description: Gets playlist
 *    parameters:
 *      - name: id
 *        in: path
 *        description: Playlist id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Gets playlist
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
playlistRouter.get(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleGetPlaylist,
);

/**
 * @swagger
 * /playlist:
 *  post:
 *    tags:
 *      - playlist
 *    summary: Creates playlist
 *    description: Creates playlist
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Playlist'
 *    responses:
 *      '200':
 *        description: Creates playlist
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
playlistRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(createPlaylistSchema),
  playlistController.handleCreatePlaylist,
);

/**
 * @swagger
 * /playlist/{id}:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Updates playlist
 *    description: Updates playlist
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Playlist'
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
 *        description: Updates playlist
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
playlistRouter.put(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updatePlaylistSchema),
  playlistController.handleUpdatePlaylist,
);

/**
 * @swagger
 * /playlist/{id}/thumbnail:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Updates playlist thumbnail
 *    description: Updates playlist thumbnail
 *    parameters:
 *      - name: id
 *        in: query
 *        description: playlist id
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
 *        description: Saves playlist thumbnail
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
playlistRouter.put(
  "/:id/thumbnail",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  multerSingleFileMiddleware,
  playlistController.handleUpdateThumbnailPlaylist,
);

/**
 * @swagger
 * /playlist/{id}:
 *  delete:
 *    tags:
 *      - playlist
 *    summary: Deletes playlist
 *    description: Deletes playlist
 *    parameters:
 *      - name: id
 *        in: query
 *        description: playlist id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Deletes playlist
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
playlistRouter.delete(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleDeletePlaylist,
);

/**
 * @swagger
 * /playlist/{id}/order:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Updates playlist order
 *    description: Updates playlist order
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              order:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: number
 *                      description: ID of the item
 *                      example: 1
 *                    order:
 *                      type: number
 *                      description: Order of the item
 *                      example: 2
 *                description: List of items with their order
 *                example:
 *                  - id: 1
 *                    order: 2
 *                  - id: 2
 *                    order: 1
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
 *        description: Updates playlist order
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
playlistRouter.put(
  "/:id/order",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(orderPlaylistSchema),
  playlistController.handleOrderPlaylist,
);

/**
 * @swagger
 * /playlist/{id}/add-item:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Updates playlist order
 *    description: Updates playlist order
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              type:
 *                type: string
 *              id:
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
 *        description: Updates playlist order
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
playlistRouter.put(
  "/:id/add-item",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(addPlaylistItemSchema),
  playlistController.handleAddPlaylistItem,
);

/**
 * @swagger
 * /playlist/{id}/remove-item/{itemId}:
 *  delete:
 *    tags:
 *      - playlist
 *    summary: Deletes playlist item
 *    description: Deletes playlist item
 *    parameters:
 *      - name: id
 *        in: query
 *        description: playlist id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *      - name: itemId
 *        in: query
 *        description: playlist item id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Deletes playlist item
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
playlistRouter.delete(
  "/:id/remove-item/:itemId",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleRemovePlaylistItem,
);

export default playlistRouter;
