import { Router } from "express";
import * as webhooksController from "controllers/webhook.controller";

const webhooksRouter = Router();

webhooksRouter.post("/workos", webhooksController.handleWorkosWebhook);

export default webhooksRouter;
