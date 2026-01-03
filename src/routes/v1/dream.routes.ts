import { ROLES } from "constants/role.constants";
import * as dreamController from "controllers/dream.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  abortMultipartUploadDreamSchema,
  completeMultipartUploadDreamSchema,
  createDreamSchema,
  createMultipartUploadDreamSchema,
  createMultipartUploadFileSchema,
  getDreamsSchema,
  refreshMultipartUploadUrlSchema,
  requestDreamSchema,
  updateDreamProcessedSchema,
  updateDreamSchema,
} from "schemas/dream.schema";
import jobRouter from "routes/v1/job.routes";

const dreamRouter = Router();

// register jobs router
dreamRouter.use("/job", jobRouter);

/**
 * @swagger
 * /dream:
 *   get:
 *     tags:
 *       - dream
 *     summary: Gets dreams
 *     description: Get dreams
 *     parameters:
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
 *     responses:
 *       '200':
 *         description: Get dreams
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         dreams:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Dream'
 *                         count:
 *                           type: number
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadApiResponse'
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 */
dreamRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getDreamsSchema),
  dreamController.handleGetDreams,
);

dreamRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createDreamSchema),
  dreamController.handleCreateDream,
);

/**
 * @swagger
 * /dream/create-multipart-upload:
 *  post:
 *    tags:
 *      - dream
 *    summary: Creates multipart upload
 *    description: Creates multipart upload. Use it to upload a new video file and create a new dream.
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               extension:
 *                 type: string
 *               parts:
 *                 type: number
 *               nsfw:
 *                 type: boolean
 *    responses:
 *      '200':
 *        description: Creates multipart upload
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/create-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createMultipartUploadDreamSchema),
  dreamController.handleCreateMultipartUpload,
);

/**
 * @swagger
 * /dream/:uuid/create-multipart-upload:
 *  post:
 *    tags:
 *      - dream
 *    summary: Creates multipart upload for a dream file type (dream, thumbnail or filmstrip file)
 *    description: Creates multipart upload. Use it to upload a new video file type (dream, thumbnail or filmstrip file) or update processed dream..
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum:
 *                  - dream
 *                  - thumbnail
 *                  - filmstrip
 *               extension:
 *                 type: string
 *               parts:
 *                 type: number
 *               frameNumber:
 *                 type: number
 *               processed:
 *                 type: boolean
 *    responses:
 *      '200':
 *        description: Creates multipart upload for a dream file.
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/create-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createMultipartUploadFileSchema),
  dreamController.handleCreateMultipartUploadDreamFile,
);

/**
 * @swagger
 * /{uuid}/refresh-multipart-upload-url:
 *  post:
 *    tags:
 *      - dream
 *    summary: Refreshes multipart upload
 *    description: Refreshes multipart upload
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum:
 *                  - dream
 *                  - thumbnail
 *                  - filmstrip
 *               uploadId:
 *                 type: string
 *               extension:
 *                 type: string
 *               part:
 *                 type: number
 *               frameNumber:
 *                 type: number
 *               processed:
 *                 type: boolean
 *    responses:
 *      '200':
 *        description: Refreshes multipart upload
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
 *                        type:
 *                          type: string
 *                          enum:
 *                           - dream
 *                           - thumbnail
 *                           - filmstrip
 *                        uploadId:
 *                          type: string
 *                        urls:
 *                          type: array
 *                          items:
 *                            type: string
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/refresh-multipart-upload-url",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(refreshMultipartUploadUrlSchema),
  dreamController.handleRefreshMultipartUploadUrl,
);

/**
 * @swagger
 * /{uuid}/complete-multipart-upload:
 *  post:
 *    tags:
 *      - dream
 *    summary: Completes multipart upload
 *    description: Completes multipart upload
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *              type:
 *                type: string
 *                enum:
 *                 - dream
 *                 - thumbnail
 *                 - filmstrip
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
 *              frameNumber:
 *                type: number
 *              processed:
 *                type: boolean
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/complete-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(completeMultipartUploadDreamSchema),
  dreamController.handleCompleteMultipartUpload,
);

/**
 * @swagger
 * /{uuid}/abort-multipart-upload:
 *  post:
 *    tags:
 *      - dream
 *    summary: Aborts multipart upload
 *    description: Aborts multipart upload
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *    responses:
 *      '200':
 *        description: Aborts multipart upload
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
dreamRouter.post(
  "/:uuid/abort-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(abortMultipartUploadDreamSchema),
  dreamController.handleAbortMultipartUpload,
);

/**
 * @swagger
 * /dream/my-dreams:
 *  get:
 *    tags:
 *      - dream
 *    summary: Gets user dreams
 *    description: Handles get user dreams
 *    parameters:
 *      - schema:
 *          type: number
 *        name: take
 *        in: query
 *      - schema:
 *          type: number
 *        name: skip
 *        in: query
 *    responses:
 *      '200':
 *        description: Get user dreams
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
 *                            $ref: '#/components/schemas/Dream'
 *                        count:
 *                          type: number
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
dreamRouter.get(
  "/my-dreams",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleGetMyDreams,
);

/**
 * @swagger
 * /dream/{uuid}/vote:
 *  get:
 *    tags:
 *      - dream
 *    summary: Gets user dream vote
 *    description: Gets user dream vote
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets user dream vote
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
 *                        vote:
 *                          $ref: '#/components/schemas/Vote'
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
dreamRouter.get(
  "/:uuid/vote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleGetDreamVote,
);

/**
 * @swagger
 * /dream/{uuid}/process-dream:
 *  put:
 *    tags:
 *      - dream
 *    summary: Start process dream
 *    description: Start process dream
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *    responses:
 *      '200':
 *        description: Start process dream
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/process-dream",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleProcessDream,
);

/**
 * @swagger
 * /dream/{uuid}/status/processing:
 *  post:
 *    tags:
 *      - dream
 *    summary: Set dream status to processing
 *    description: Set dream status to processing
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *    responses:
 *      '200':
 *        description: Set dream status to processing
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/status/processing",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleSetDreamStatusProcessing,
);

/**
 * @swagger
 * /dream/{uuid}/status/processed:
 *  post:
 *    tags:
 *      - dream
 *    summary: Set dream status to processed
 *    description: Set dream status to processed
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               processedVideoSize:
 *                 type: number
 *               processedVideoFrames:
 *                 type: number
 *               processedVideoFPS:
 *                 type: number
 *               activityLevel:
 *                 type: number
 *               md5:
 *                 type: string
 *    responses:
 *      '200':
 *        description: Set dream status to processed
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/status/processed",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateDreamProcessedSchema),
  dreamController.handleSetDreamStatusProcessed,
);

/**
 * @swagger
 * /dream/{uuid}/status/failed:
 *  post:
 *    tags:
 *      - dream
 *    summary: Set dream status to failed
 *    description: Set dream status to failed
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *    responses:
 *      '200':
 *        description: Set dream status to failed
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
 *      - apiKeyAuth: []
 */
dreamRouter.post(
  "/:uuid/status/failed",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleSetDreamStatusFailed,
);

/**
 * @swagger
 * /dream/{uuid}:
 *  get:
 *    tags:
 *      - dream
 *    summary: Gets dream
 *    description: Get dream
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Get dream
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
 *      - apiKeyAuth: []
 */
dreamRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleGetDream,
);

/**
 * @swagger
 * /dream/{uuid}:
 *  put:
 *    tags:
 *      - dream
 *    summary: Update dream
 *    description: Update dreams
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Dream'
 *    responses:
 *      '200':
 *        description: Create dreams
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
 *      - apiKeyAuth: []
 */
dreamRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updateDreamSchema),
  dreamController.handleUpdateDream,
);

/**
 * @swagger
 *  /dream/{uuid}/thumbnail:
 *   put:
 *     tags:
 *       - dream
 *     summary: Update thumbnail file
 *     description: Update thumbnail file
 *     parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Dream updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         dream:
 *                           $ref: '#/components/schemas/Dream'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadApiResponse'
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 */
dreamRouter.put(
  "/:uuid/thumbnail",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  multerSingleFileMiddleware,
  validatorMiddleware(requestDreamSchema),
  dreamController.handleUpdateThumbnailDream,
);

/**
 * @swagger
 * /dream/{uuid}:
 *  delete:
 *    tags:
 *      - dream
 *    summary: Deletes dream
 *    description: Deletes dream
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Deletes dream
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
dreamRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleDeleteDream,
);

/**
 * @swagger
 * /dream/{uuid}/upvote:
 *  put:
 *    tags:
 *      - dream
 *    summary: Updates dream to upvote
 *    description: Updates dream upvote
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Updates dream upvote
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
 *      - apiKeyAuth: []
 */
dreamRouter.put(
  "/:uuid/upvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleUpvoteDream,
);

/**
 * @swagger
 * /dream/{uuid}/downvote:
 *  put:
 *    tags:
 *      - dream
 *    summary: Updates dream to downvote
 *    description: Updates dream to downvote
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Updates dream to downvote
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
 *      - apiKeyAuth: []
 */
dreamRouter.put(
  "/:uuid/downvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleDownvoteDream,
);

/**
 * @swagger
 * /dream/{uuid}/unvote:
 *  put:
 *    tags:
 *      - dream
 *    summary: Updates dream to unvote
 *    description: Updates dream to unvote
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: dream uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Updates dream to unvote
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
 *      - apiKeyAuth: []
 */
dreamRouter.put(
  "/:uuid/unvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestDreamSchema),
  dreamController.handleUnvoteDream,
);

export default dreamRouter;
