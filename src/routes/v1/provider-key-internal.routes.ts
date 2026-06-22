import * as providerKeyController from "controllers/provider-key.controller";
import { Router } from "express";
import { requireInternalKey } from "middlewares/internal-key.middleware";

const providerKeyInternalRouter = Router();

providerKeyInternalRouter.get(
  "/resolve",
  requireInternalKey,
  providerKeyController.handleResolveProviderKey,
);

export default providerKeyInternalRouter;
