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
  confirmDreamSchema,
  createMultipartUploadDreamSchema,
  createPresignedDreamSchema,
  getDreamsSchema,
  refreshMultipartUploadUrlSchema,
  updateDreamSchema,
} from "schemas/dream.schema";

const dreamRouter = Router();

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
  "/create-presigned-post",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createPresignedDreamSchema),
  dreamController.handleCreatePresignedPost,
);

dreamRouter.post(
  "/:uuid/confirm-presigned-post",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(confirmDreamSchema),
  dreamController.handleConfirmPresignedPost,
);

dreamRouter.post(
  "/create-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(createMultipartUploadDreamSchema),
  dreamController.handleCreateMultipartUpload,
);

dreamRouter.post(
  "/:uuid/refresh-multipart-upload-url",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(refreshMultipartUploadUrlSchema),
  dreamController.handleRefreshMultipartUploadUrl,
);

dreamRouter.post(
  "/:uuid/complete-multipart-upload",
  requireAuth,
  checkRoleMiddleware([ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP]),
  validatorMiddleware(completeMultipartUploadDreamSchema),
  dreamController.handleCompleteMultipartUpload,
);

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

dreamRouter.get(
  "/:uuid/vote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleGetDreamVote,
);

dreamRouter.post(
  "/:uuid/process-dream",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleProcessDream,
);

dreamRouter.post(
  "/:uuid/status/processing",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleSetDreamStatusProcessing,
);

dreamRouter.post(
  "/:uuid/status/processed",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  dreamController.handleSetDreamStatusProcessed,
);

dreamRouter.post(
  "/:uuid/status/failed",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
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
 */
dreamRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
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
 *                         dreams:
 *                           $ref: '#/components/schemas/Dream'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadApiResponse'
 *     security:
 *       - bearerAuth: []
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
  dreamController.handleUpdateThumbnailDream,
);

dreamRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleDeleteDream,
);

dreamRouter.put(
  "/:uuid/upvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleUpvoteDream,
);

dreamRouter.put(
  "/:uuid/downvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleDownvoteDream,
);

dreamRouter.put(
  "/:uuid/unvote",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  dreamController.handleUnvoteDream,
);

export default dreamRouter;
