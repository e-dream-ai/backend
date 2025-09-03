import { ROLES } from "constants/role.constants";
import * as playlistController from "controllers/playlist.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  addPlaylistItemSchema,
  addPlaylistKeyframeSchema,
  createPlaylistSchema,
  getPlaylistItemsSchema,
  getPlaylistKeyframesSchema,
  orderPlaylistSchema,
  removePlaylistItemSchema,
  removePlaylistKeyframeSchema,
  requestPlaylistSchema,
  updatePlaylistSchema,
} from "schemas/playlist.schema";
const playlistRouter = Router();

/**
 * @swagger
 * /playlist/default:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets default playlist data
 *    description: Gets default playlist data
 *    responses:
 *      '200':
 *        description: Gets default playlist data
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
playlistRouter.get(
  "/default",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleGetDefaultPlaylist,
);

/**
 * @swagger
 * /playlist/{uuid}/references:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets parent references of the playlist
 *    description: Gets parent references of the playlist
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets parent references of the playlist
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
playlistRouter.get(
  "/:uuid/references",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestPlaylistSchema),
  playlistController.handleGetPlaylistReferences,
);

/**
 * @swagger
 * /playlist/{uuid}:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets playlist
 *    description: Gets playlist
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
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
 *      - apiKeyAuth: []
 */
playlistRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestPlaylistSchema),
  playlistController.handleGetPlaylist,
);

/**
 * @swagger
 * /playlist/{uuid}/items:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets paginated playlist items
 *    description: Gets paginated playlist items
 *    parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Playlist UUID
 *       - in: query
 *         name: take
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items to return (default 30)
 *       - in: query
 *         name: skip
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Number of items to skip (default 0)
 *    responses:
 *      '200':
 *        description: Paginated playlist items
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
 *                        items:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/PlaylistItem'
 *                        totalCount:
 *                          type: number
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *      '404':
 *        description: Playlist not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
playlistRouter.get(
  "/:uuid/items",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getPlaylistItemsSchema),
  playlistController.handleGetPlaylistItems,
);

/**
 * @swagger
 * /playlist/{uuid}/keyframes:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets paginated playlist keyframes
 *    description: Gets paginated playlist keyframes
 *    parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Playlist UUID
 *       - in: query
 *         name: take
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *         description: Number of keyframes to return (default 30)
 *       - in: query
 *         name: skip
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Number of keyframes to skip (default 0)
 *    responses:
 *      '200':
 *        description: Paginated playlist keyframes
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
 *                        keyframes:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/PlaylistKeyframe'
 *                        totalCount:
 *                          type: number
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *      '404':
 *        description: Playlist not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 */
playlistRouter.get(
  "/:uuid/keyframes",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getPlaylistKeyframesSchema),
  playlistController.handleGetPlaylistKeyframes,
);

/**
 * @swagger
 * /playlist/{uuid}:
 *  get:
 *    tags:
 *      - playlist
 *    summary: Gets playlists
 *    description: Gets playlists
 *    parameters:
 *       - schema:
 *           type: number
 *         name: take
 *         in: query
 *       - schema:
 *           type: number
 *         name: skip
 *         in: query
 *       - schema:
 *           type: string
 *         name: userUUID
 *         in: query
 *    responses:
 *      '200':
 *        description: Gets playlists
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
 *                        playlists:
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
playlistRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleGetPlaylists,
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
 *            $ref: '#/components/schemas/CreatePlaylistRequest'
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
 *      - apiKeyAuth: []
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
 * /playlist/{uuid}:
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
 *            $ref: '#/components/schemas/UpdatePlaylistRequest'
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
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
 *      - apiKeyAuth: []
 */
playlistRouter.put(
  "/:uuid",
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
 * /playlist/{uuid}/thumbnail:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Updates playlist thumbnail
 *    description: Updates playlist thumbnail
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
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
 *      - apiKeyAuth: []
 */
playlistRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestPlaylistSchema),
  multerSingleFileMiddleware,
  playlistController.handleUpdateThumbnailPlaylist,
);

/**
 * @swagger
 * /playlist/{uuid}:
 *  delete:
 *    tags:
 *      - playlist
 *    summary: Deletes playlist
 *    description: Deletes playlist
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
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
 *      - apiKeyAuth: []
 */
playlistRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestPlaylistSchema),
  playlistController.handleDeletePlaylist,
);

/**
 * @swagger
 * /playlist/{uuid}/order:
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
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
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
 *      - apiKeyAuth: []
 */
playlistRouter.put(
  "/:uuid/order",
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
 * /playlist/{uuid}/add-item:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Adds playlist item
 *    description: Adds playlist item
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              type:
 *                type: string
 *              uuid:
 *                type: string
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Adds playlist item
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
playlistRouter.put(
  "/:uuid/add-item",
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
 * /playlist/{uuid}/remove-item/{itemId}:
 *  delete:
 *    tags:
 *      - playlist
 *    summary: Deletes playlist item
 *    description: Deletes playlist item
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
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
 *      - apiKeyAuth: []
 */
playlistRouter.delete(
  "/:uuid/remove-item/:itemId",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(removePlaylistItemSchema),
  playlistController.handleRemovePlaylistItem,
);

/**
 * @swagger
 * /playlist/{uuid}/keyframe:
 *  put:
 *    tags:
 *      - playlist
 *    summary: Adds playlist keyframe
 *    description: Adds playlist keyframe
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              type:
 *                type: string
 *              uuid:
 *                type: number
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Adds playlist keyframe
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
playlistRouter.post(
  "/:uuid/keyframe",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(addPlaylistKeyframeSchema),
  playlistController.handleAddPlaylistKeyframe,
);

/**
 * @swagger
 * /playlist/{uuid}/keyframe/{playlistKeyframeId}:
 *  delete:
 *    tags:
 *      - playlist
 *    summary: Deletes playlist keyframe
 *    description: Deletes playlist keyframe
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Playlist uuid
 *        required: true
 *        schema:
 *          type: string
 *      - name: playlistKeyframeId
 *        in: query
 *        description: playlist keyframe id
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *    responses:
 *      '200':
 *        description: Deletes playlist keyframe
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
playlistRouter.delete(
  "/:uuid/keyframe/:playlistKeyframeId",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(removePlaylistKeyframeSchema),
  playlistController.handleRemovePlaylistKeyframe,
);

export default playlistRouter;
