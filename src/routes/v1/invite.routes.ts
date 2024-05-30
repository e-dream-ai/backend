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

inviteRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(inviteQuerySchema),
  inviteController.handleGetInvites,
);

inviteRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(createInviteSchema),
  inviteController.handleCreateInvite,
);

inviteRouter.put(
  "/:id/invalidate",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  validatorMiddleware(invalidateInviteSchema),
  inviteController.handleInvalidateInvite,
);

export default inviteRouter;
