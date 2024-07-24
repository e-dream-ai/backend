import { ROLES } from "constants/role.constants";
import * as inviteController from "controllers/invite.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  createInviteSchema,
  inviteQuerySchema,
  invalidateInviteSchema,
} from "schemas/invite.schema";

const inviteRouter = Router();

/**
 * @swagger
 * /invite:
 *  get:
 *    tags:
 *      - invite
 *    summary: Gets invites
 *    description: Handles get invites
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
 *        description: Get invites
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
 *                        invites:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Invite'
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
inviteRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(inviteQuerySchema),
  inviteController.handleGetInvites,
);

/**
 * @swagger
 * /invite:
 *  post:
 *    tags:
 *      - invite
 *    summary: Creates invite
 *    description: Creates invite
 *    requestBody:
 *      content:
 *        application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: number
 *               codeLength:
 *                 type: number
 *               email:
 *                 type: string
 *    responses:
 *      '200':
 *        description: Creates invite
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
 *                        invite:
 *                          $ref: '#/components/schemas/Invite'
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
inviteRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(createInviteSchema),
  inviteController.handleCreateInvite,
);

/**
 * @swagger
 * /invite/{id}/invalidate:
 *  put:
 *    tags:
 *      - invite
 *    summary: Invalidates invite
 *    description: Invalidates invite
 *    parameters:
 *      - name: id
 *        in: query
 *        description: invite id
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      content:
 *        application/json:
 *    responses:
 *      '200':
 *        description: Invalidates invite
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
 *                        invite:
 *                          $ref: '#/components/schemas/Invite'
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
inviteRouter.put(
  "/:id/invalidate",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(invalidateInviteSchema),
  inviteController.handleInvalidateInvite,
);

export default inviteRouter;
