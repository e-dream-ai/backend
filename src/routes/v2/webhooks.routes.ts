import { Router } from "express";
import * as webhooksController from "controllers/webhook.controller";
import bodyParser from "body-parser";

const webhooksRouter = Router();

webhooksRouter.post(
  "/workos",
  bodyParser.raw({ type: "application/json" }),
  webhooksController.handleWorkosWebhook,
);

export default webhooksRouter;
