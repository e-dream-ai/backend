import { ROLES } from "constants/role.constants";
import * as editorProjectController from "controllers/editor-project.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  createEditorProjectSchema,
  deleteEditorProjectSchema,
  lockEditorProjectSchema,
  unlockEditorProjectSchema,
  getEditorProjectSchema,
  getEditorProjectsSchema,
  updateEditorProjectSchema,
} from "schemas/editor-project.schema";

const editorProjectRouter = Router();

const allowedRoles = checkRoleMiddleware([
  ROLES.USER_GROUP,
  ROLES.CREATOR_GROUP,
  ROLES.ADMIN_GROUP,
]);

/**
 * @swagger
 * /api/v2/editor-projects:
 *  get:
 *    tags:
 *      - editor-project
 *    summary: Lists the signed in user's editor projects
 *    description: Returns metadata only, without the state blob
 *    parameters:
 *      - schema:
 *          type: string
 *        name: editorId
 *        in: query
 *      - schema:
 *          type: string
 *        name: playlistUuid
 *        in: query
 *      - schema:
 *          type: string
 *        name: search
 *        in: query
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
 *        description: Lists editor projects
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
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
editorProjectRouter.get(
  "/",
  requireAuth,
  allowedRoles,
  validatorMiddleware(getEditorProjectsSchema),
  editorProjectController.handleGetEditorProjects,
);

/**
 * @swagger
 * /api/v2/editor-projects/{uuid}:
 *  get:
 *    tags:
 *      - editor-project
 *    summary: Gets one editor project including its state
 *    description: Gets one editor project including its state
 *    parameters:
 *      - name: uuid
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets editor project
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '404':
 *        description: Not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.get(
  "/:uuid",
  requireAuth,
  allowedRoles,
  validatorMiddleware(getEditorProjectSchema),
  editorProjectController.handleGetEditorProject,
);

/**
 * @swagger
 * /api/v2/editor-projects:
 *  post:
 *    tags:
 *      - editor-project
 *    summary: Creates an editor project
 *    description: Creates an editor project
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - editorId
 *              - name
 *              - state
 *            properties:
 *              editorId:
 *                type: string
 *              name:
 *                type: string
 *              state:
 *                type: object
 *              schemaVersion:
 *                type: number
 *              thumbnailDreamUuid:
 *                type: string
 *              playlistUuid:
 *                type: string
 *    responses:
 *      '201':
 *        description: Created
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '409':
 *        description: Name already used in this editor
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.post(
  "/",
  requireAuth,
  allowedRoles,
  validatorMiddleware(createEditorProjectSchema),
  editorProjectController.handleCreateEditorProject,
);

/**
 * @swagger
 * /api/v2/editor-projects/{uuid}:
 *  put:
 *    tags:
 *      - editor-project
 *    summary: Updates an editor project
 *    description: Requires the current revision, and returns 409 when it is stale
 *    parameters:
 *      - name: uuid
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - revision
 *            properties:
 *              revision:
 *                type: number
 *              name:
 *                type: string
 *              state:
 *                type: object
 *              schemaVersion:
 *                type: number
 *              thumbnailDreamUuid:
 *                type: string
 *              playlistUuid:
 *                type: string
 *              sessionId:
 *                type: string
 *                description: Editing session holding the lock
 *    responses:
 *      '200':
 *        description: Updated
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '409':
 *        description: Stale revision, response carries the current project
 *      '423':
 *        description: Another session holds the edit lock
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.put(
  "/:uuid",
  requireAuth,
  allowedRoles,
  validatorMiddleware(updateEditorProjectSchema),
  editorProjectController.handleUpdateEditorProject,
);

/**
 * @swagger
 * /api/v2/editor-projects/{uuid}:
 *  delete:
 *    tags:
 *      - editor-project
 *    summary: Soft deletes an editor project
 *    description: Soft deletes an editor project
 *    parameters:
 *      - name: uuid
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Deleted
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/ApiResponse'
 *      '404':
 *        description: Not found
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.delete(
  "/:uuid",
  requireAuth,
  allowedRoles,
  validatorMiddleware(deleteEditorProjectSchema),
  editorProjectController.handleDeleteEditorProject,
);

/**
 * @openapi
 * /api/v2/editor-projects/{uuid}/lock:
 *  put:
 *    tags:
 *      - Editor Projects
 *    summary: Claim or refresh the edit lock on a project
 *    parameters:
 *      - schema:
 *          type: string
 *        name: uuid
 *        in: path
 *        required: true
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - sessionId
 *            properties:
 *              sessionId:
 *                type: string
 *              force:
 *                type: boolean
 *    responses:
 *      '200':
 *        description: Lock held by this session
 *      '404':
 *        description: Not Found
 *      '423':
 *        description: Held by another session
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.put(
  "/:uuid/lock",
  requireAuth,
  allowedRoles,
  validatorMiddleware(lockEditorProjectSchema),
  editorProjectController.handleLockEditorProject,
);

/**
 * @openapi
 * /api/v2/editor-projects/{uuid}/lock:
 *  delete:
 *    tags:
 *      - Editor Projects
 *    summary: Release the edit lock held by a session
 *    parameters:
 *      - schema:
 *          type: string
 *        name: uuid
 *        in: path
 *        required: true
 *      - schema:
 *          type: string
 *        name: sessionId
 *        in: query
 *        required: true
 *    responses:
 *      '204':
 *        description: Released
 *      '404':
 *        description: Not Found
 *    security:
 *      - bearerAuth: []
 *      - apiKeyAuth: []
 */
editorProjectRouter.delete(
  "/:uuid/lock",
  requireAuth,
  allowedRoles,
  validatorMiddleware(unlockEditorProjectSchema),
  editorProjectController.handleUnlockEditorProject,
);

export default editorProjectRouter;
