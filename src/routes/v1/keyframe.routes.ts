import { ROLES } from "constants/role.constants";
import * as keyframeController from "controllers/keyframe.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  completeMultipartUploadKeyframeSchema,
  createKeyframeSchema,
  createMultipartUploadFileSchema,
  getKeyframesSchema,
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
  validatorMiddleware(getKeyframesSchema),
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
 * /keyframe/:uuid/create-multipart-upload:
 *  post:
 *    tags:
 *      - keyframe
 *    summary: Creates multipart upload for a keyframe file type
 *    description: Creates multipart upload. Use it to upload a new keyframe file or update..
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               extension:
 *                 type: string
 *    responses:
 *      '200':
 *        description: Creates multipart upload for a keyframe file.
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
 *                        uploadId:
 *                          type: string
 *                        urls:
 *                          type: array
 *                          items:
 *                            type: string
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
  "/:uuid/image/init",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createMultipartUploadFileSchema),
  keyframeController.handleInitKeyframeImageUpload,
);

/**
 * @swagger
 * /{uuid}/image/complete:
 *  post:
 *    tags:
 *      - keyframe
 *    summary: Completes multipart upload
 *    description: Completes multipart upload
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *              uploadId:
 *                type: string
 *              parts:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    ETag:
 *                      type: string
 *                    PartNumber:
 *                      type: number
 *              extension:
 *                type: string
 *    responses:
 *      '200':
 *        description: Completes multipart upload
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
  "/:uuid/image/complete",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(completeMultipartUploadKeyframeSchema),
  keyframeController.handleCompleteKeyframeImageUpload,
);

/**
 * @swagger
 * /keyframe/{uuid}/image:
 *  delete:
 *    tags:
 *      - keyframe
 *    summary: Deletes image keyframe
 *    description: Deletes image keyframe
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Keyframe uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Deletes image keyframe
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
  "/:uuid/image",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestKeyframeSchema),
  keyframeController.handleDeleteImageKeyframe,
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
