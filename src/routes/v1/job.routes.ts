import { ROLES } from "constants/role.constants";
import * as jobController from "controllers/job.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";

const jobRouter = Router();

/**
 * @swagger
 * /job:
 *  get:
 *    tags:
 *      - job
 *    summary: Gets jobs
 *    description: Handles get jobs
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
 *        description: Get jobs
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
 *                        jobs:
 *                          type: array
 *                          items: string
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
jobRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  jobController.handleGetJobs,
);

// jobRouter.post(
//   "/turn-on",
//   requireAuth,
//   checkRoleMiddleware([ROLES.ADMIN_GROUP]),
//   jobController.handleTurnOn,
// );

// jobRouter.post(
//   "/turn-off",
//   requireAuth,
//   checkRoleMiddleware([ROLES.ADMIN_GROUP]),
//   jobController.handleTurnOff,
// );

export default jobRouter;
