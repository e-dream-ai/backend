import { ROLES } from "constants/role.constants";
import * as clientController from "controllers/client.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  clientDreamsRequestSchema,
  clientDreamsSchema,
} from "schemas/client.schema";
import { requestDreamSchema } from "schemas/dream.schema";
import { requestPlaylistSchema } from "schemas/playlist.schema";

const clientRouter = Router();

/**
 * @swagger
 * /client/hello:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets client hello data
 *    description: Gets client hello data
 *    responses:
 *      '200':
 *        description: Gets client hello data
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
 *                  properties:
 *                    data:
 *                      type: object
 *                      $ref: '#/components/schemas/Hello'
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
clientRouter.get(
  "/hello",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  clientController.handleHello,
);

/**
 * @swagger
 * /client/playlist/default:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets client default playlist data
 *    description: Gets client default playlist data
 *    responses:
 *      '200':
 *        description: Gets client default playlist data
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
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               uuid:
 *                                 type: string
 *                               timestamp:
 *                                 type: number
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
clientRouter.get(
  "/playlist/default",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  clientController.handleGetDefaultPlaylist,
);

/**
 * @swagger
 * /client/playlist/{uuid}:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets client playlist data with processed dreams only
 *    description: Gets client playlist data with processed dreams only
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: playlist uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets client playlist data
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
 *                          type: object
 *                          $ref: '#/components/schemas/ClientPlaylist'
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
clientRouter.get(
  "/playlist/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestPlaylistSchema),
  clientController.handleGetPlaylist,
);

/**
 * @swagger
 * /client/dream/{uuid}/url:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets download dream url
 *    description: Gets download dream url
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets download dream url
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
 *                        url:
 *                          type: string
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
clientRouter.get(
  "/dream/:uuid/url",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  clientController.handleGetDownloadUrl,
);

/**
 * @swagger
 * /client/dream:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets dreams
 *    description: Gets dreams
 *    parameters:
 *      - name: uuids
 *        in: query
 *        description: uuids separated by comma ","
 *        required: false
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets dreams
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
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/ClientDream'
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
clientRouter.get(
  "/dream",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(clientDreamsSchema),
  clientController.handleGetDreams,
);

/**
 * @swagger
 * /client/dream:
 *  post:
 *    tags:
 *      - client
 *    summary: Gets dreams
 *    description: Gets dreams
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              uuids:
 *                type: array
 *                items:
 *                  type: string
 *    responses:
 *      '200':
 *        description: Gets dreams
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
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/ClientDream'
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
clientRouter.post(
  "/dream",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(clientDreamsRequestSchema),
  clientController.handleDreamsRequest,
);

/**
 * @swagger
 * /client/user/dislikes:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets disliked dreams
 *    description: Gets disliked dreams
 *    responses:
 *      '200':
 *        description: Gets disliked dreams
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
clientRouter.get(
  "/user/dislikes",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  clientController.handleGetUserDislikes,
);

/**
 * @swagger
 * /client/quota:
 *  get:
 *    tags:
 *      - client
 *    summary: Gets user quota
 *    description: Gets user quota
 *    responses:
 *      '200':
 *        description: Gets user quota
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
 *                        quota:
 *                          type: number
 *                        quotaExpiresAt:
 *                          type: string
 *                          format: date-time
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
clientRouter.get(
  "/quota",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  clientController.handleQuota,
);

/**
 * @swagger
 * /client/telemetry:
 *  post:
 *    tags:
 *      - client
 *    summary: Receives telemetry
 *    description: Receives telemetry
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *    responses:
 *      '200':
 *        description: Telemetry received
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ApiResponse'
 *                - type: object
 *                  properties:
 *                    data:
 *                      type: object
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
clientRouter.post(
  "/telemetry",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  clientController.handleTelemetry,
);

export default clientRouter;
