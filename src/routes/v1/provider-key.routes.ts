import { ROLES } from "constants/role.constants";
import * as providerKeyController from "controllers/provider-key.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  deleteProviderKeySchema,
  getProviderKeySchema,
  upsertProviderKeySchema,
} from "schemas/provider-key.schema";

const providerKeyRouter = Router();

const allowedRoles = [ROLES.USER_GROUP, ROLES.CREATOR_GROUP, ROLES.ADMIN_GROUP];

/**
 * @swagger
 * /api/v1/provider-keys:
 *   post:
 *     tags: [provider-keys]
 *     summary: Add or replace the caller's provider API key (validated on save)
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *   get:
 *     tags: [provider-keys]
 *     summary: Get validation status of the caller's provider key
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 */
providerKeyRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware(allowedRoles),
  validatorMiddleware(upsertProviderKeySchema),
  providerKeyController.handleUpsertProviderKey,
);

providerKeyRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware(allowedRoles),
  validatorMiddleware(getProviderKeySchema),
  providerKeyController.handleGetProviderKeyStatus,
);

providerKeyRouter.delete(
  "/:provider",
  requireAuth,
  checkRoleMiddleware(allowedRoles),
  validatorMiddleware(deleteProviderKeySchema),
  providerKeyController.handleDeleteProviderKey,
);

export default providerKeyRouter;
