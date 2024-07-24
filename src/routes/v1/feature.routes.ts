import { ROLES } from "constants/role.constants";
import * as featureController from "controllers/feature.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { updateFeatureSchema } from "schemas/feature.schema";

const featureRouter = Router();

/**
 * @swagger
 * /feature:
 *  get:
 *    tags:
 *      - feature
 *    summary: Gets features
 *    description: Gets features
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
 *        description: Gets features
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
 *                        features:
 *                          type: array
 *                          items:
 *                            $ref: '#/components/schemas/Feature'
 *      '400':
 *        description: Bad request
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/BadApiResponse'
 */
featureRouter.get("/", featureController.handleGetFeatures);

/**
 * @swagger
 * /feature:
 *  put:
 *    tags:
 *      - feature
 *    summary: Updates feature
 *    description: Updates feature
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Feature'
 *    responses:
 *      '200':
 *        description: Updates feature
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
 *                        feature:
 *                          $ref: '#/components/schemas/Feature'
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
featureRouter.put(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(updateFeatureSchema),
  featureController.handleUpdateFeature,
);

export default featureRouter;
