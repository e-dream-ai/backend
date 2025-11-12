import { ROLES } from "constants/role.constants";
import * as feedController from "controllers/feed.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { feedSchema } from "schemas/feed.schema";

const feedRouter = Router();

/**
 * @swagger
 * /feed/ranked:
 *  get:
 *    tags:
 *      - feed
 *    summary: Gets ranked playlist
 *    description: Gets ranked playlist
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
 *      - name: search
 *        in: query
 *        description: Search query to filter playlists by name
 *        required: false
 *        schema:
 *          type: string
 *          example: "my playlist"
 *    responses:
 *      '200':
 *        description: Gets ranked playlist
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
 *                        feed:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/FeedItem'
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
feedRouter.get(
  "/ranked",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(feedSchema),
  feedController.handleGetRankedFeed,
);

/**
 * @swagger
 * /feed/:
 *  get:
 *    tags:
 *      - feed
 *    summary: Gets feed content
 *    description: Gets feed content
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
 *        description: Gets feed content
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
 *                        feed:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/FeedItem'
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
feedRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(feedSchema),
  feedController.handleGetFeed,
);

/**
 * @swagger
 * /feed/grouped:
 *  get:
 *    tags:
 *      - feed
 *    summary: Gets grouped feed content with virtual playlists
 *    description: Gets feed content with virtual playlist grouping applied on the backend
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
 *        description: Gets grouped feed content
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
 *                        feedItems:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/FeedItem'
 *                        virtualPlaylists:
 *                          type: array
 *                          items:
 *                            type: object
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
feedRouter.get(
  "/grouped",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(feedSchema),
  feedController.handleGetGroupedFeed,
);

/**
 * @swagger
 * /feed/my-dreams:
 *  get:
 *    tags:
 *      - feed
 *    summary: Gets my dreams feed content
 *    description: Gets my dreams feed content
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
 *        description: Gets my dreams feed content
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
 *                        feed:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/FeedItem'
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
feedRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(feedSchema),
  feedController.handleGetMyDreams,
);

export default feedRouter;
