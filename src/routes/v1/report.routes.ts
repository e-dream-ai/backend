import { ROLES } from "constants/role.constants";
import * as reportController from "controllers/report.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  createReportSchema,
  getReportsSchema,
  requestReportSchema,
  updateReportSchema,
} from "schemas/report.schema";
const reportRouter = Router();

/**
 * @swagger
 * /report/{uuid}:
 *  get:
 *    tags:
 *      - report
 *    summary: Gets report
 *    description: Gets report
 *    parameters:
 *      - name: uuid
 *        in: path
 *        description: Report uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Gets report
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
 *                        report:
 *                          $ref: '#/components/schemas/Report'
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
reportRouter.get(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getReportsSchema),
  reportController.handleGetReport,
);

/**
 * @swagger
 * /report/{uuid}:
 *  get:
 *    tags:
 *      - report
 *    summary: Gets reports
 *    description: Gets reports
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
 *        description: Gets reports
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
 *                        reports:
 *                          $ref: '#/components/schemas/Report'
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
reportRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  reportController.handleGetReports,
);

/**
 * @swagger
 * /report:
 *  post:
 *    tags:
 *      - report
 *    summary: Creates report
 *    description: Creates report
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Report'
 *    responses:
 *      '200':
 *        description: Creates report
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
 *                        report:
 *                          $ref: '#/components/schemas/Report'
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
reportRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(createReportSchema),
  reportController.handleCreateReport,
);

/**
 * @swagger
 * /report/{uuid}:
 *  put:
 *    tags:
 *      - report
 *    summary: Updates report
 *    description: Updates report
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Report'
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Report uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Updates report
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
 *                        report:
 *                          $ref: '#/components/schemas/Report'
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
reportRouter.put(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updateReportSchema),
  reportController.handleUpdateReport,
);

/**
 * @swagger
 * /report/{uuid}:
 *  delete:
 *    tags:
 *      - report
 *    summary: Deletes report
 *    description: Deletes report
 *    parameters:
 *      - name: uuid
 *        in: query
 *        description: Report uuid
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        description: Deletes report
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
reportRouter.delete(
  "/:uuid",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(requestReportSchema),
  reportController.handleDeleteReport,
);

export default reportRouter;
