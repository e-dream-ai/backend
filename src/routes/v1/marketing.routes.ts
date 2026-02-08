import { ROLES } from "constants/role.constants";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import {
  handleSendMarketingEmails,
  handleSendOneMarketingEmail,
  handleUnsubscribeMarketing,
} from "controllers/marketing.controller";

const marketingRouter = Router();

marketingRouter.post(
  "/send",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  handleSendMarketingEmails,
);

marketingRouter.post(
  "/send-one",
  requireAuth,
  checkRoleMiddleware([ROLES.ADMIN_GROUP]),
  handleSendOneMarketingEmail,
);

marketingRouter.post("/unsubscribe", handleUnsubscribeMarketing);

marketingRouter.get("/unsubscribe", handleUnsubscribeMarketing);

export default marketingRouter;
