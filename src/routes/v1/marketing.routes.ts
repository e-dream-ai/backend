import { Router } from "express";
import {
  handleSendMarketingEmails,
  handleSendOneMarketingEmail,
  handleUnsubscribeMarketing,
} from "controllers/marketing.controller";

const marketingRouter = Router();

marketingRouter.post("/send", handleSendMarketingEmails);

marketingRouter.post("/send-one", handleSendOneMarketingEmail);

marketingRouter.post("/unsubscribe", handleUnsubscribeMarketing);

marketingRouter.get("/unsubscribe", handleUnsubscribeMarketing);

export default marketingRouter;
