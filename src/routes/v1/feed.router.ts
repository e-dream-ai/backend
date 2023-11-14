import * as feedController from "controllers/feed.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";

const feedRouter = Router();

feedRouter.get("/", requireAuth, feedController.handleGetFeed);

feedRouter.get("/my-dreams", requireAuth, feedController.handleGetMyDreams);

export default feedRouter;
