import { ROLES } from "constants/role.constants";
import * as keyframeController from "controllers/keyframe.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  createKeyframeSchema,
  requestKeyframeSchema,
  updateKeyframeSchema,
} from "schemas/keyframe.schema";
const keyframeRouter = Router();

/**
 * @swagger
 * /keyframe/{uuid}:
 *  get:
 *    tags:
 *      - keyframe
 *    summary: Gets keyframe
 *    description: Gets keyframe
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: Keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets keyframe
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
 *                        keyframe:
 *                          $ref: '#/components/schemas/Keyframe'
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
keyframeRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestKeyframeSchema),
  keyframeController.handleGetKeyframe,
);

/**
 * @swagger
 * /keyframe/{uuid}:
 *  get:
 *    tags:
 *      - keyframe
 *    summary: Gets keyframes
 *    description: Gets keyframes
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
 *        description: Gets keyframes
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
 *                          $ref: '#/components/schemas/Keyframe'
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
keyframeRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  keyframeController.handleGetKeyframes,
);

/**
 * @swagger
 * /keyframe:
 *  post:
 *    tags:
 *      - keyframe
 *    summary: Creates keyframe
 *    description: Creates keyframe
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Keyframe'
 *    responses:
 *      '200':
 *        description: Creates keyframe
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
 *                        keyframe:
 *                          $ref: '#/components/schemas/Keyframe'
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
keyframeRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(createKeyframeSchema),
  keyframeController.handleCreateKeyframe,
);

/**
 * @swagger
 * /keyframe/{uuid}:
 *  put:
 *    tags:
 *      - keyframe
 *    summary: Updates keyframe
 *    description: Updates keyframe
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Keyframe'
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Updates keyframe
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
 *                        keyframe:
 *                          $ref: '#/components/schemas/Keyframe'
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
keyframeRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updateKeyframeSchema),
  keyframeController.handleUpdateKeyframe,
);

/**
 * @swagger
 * /keyframe/{uuid}/image:
 *  put:
 *    tags:
 *      - keyframe
 *    summary: Updates keyframe image
 *    description: Updates keyframe image
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Keyframe uuid
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
 *        description: Saves keyframe image
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
 *                        keyframe:
 *                          $ref: '#/components/schemas/Keyframe'
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
keyframeRouter.put(
  "/:uuid/image",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestKeyframeSchema),
  multerSingleFileMiddleware,
  //   keyframeController.handleUpdateImageKeyframe,
);

/**
 * @swagger
 * /keyframe/{uuid}:
 *  delete:
 *    tags:
 *      - keyframe
 *    summary: Deletes keyframe
 *    description: Deletes keyframe
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Deletes keyframe
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
keyframeRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestKeyframeSchema),
  keyframeController.handleDeleteKeyframe,
);

export default keyframeRouter;
