import { ROLES } from "constants/role.constants";
import * as modelsController from "controllers/models.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { getModelsSchema } from "schemas/model.schema";

const modelsRouter = Router();

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     tags:
 *       - models
 *     summary: List available generation models
 *     description: Returns the catalog of generation models the client can choose from, optionally filtered by media type.
 *     parameters:
 *       - schema:
 *           type: string
 *           enum:
 *             - video
 *             - image
 *         name: mediaType
 *         in: query
 *     responses:
 *       '200':
 *         description: Model catalog
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
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
modelsRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getModelsSchema),
  modelsController.handleGetModels,
);

export default modelsRouter;
