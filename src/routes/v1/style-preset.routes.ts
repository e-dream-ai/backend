import { ROLES } from "constants/role.constants";
import * as stylePresetController from "controllers/style-preset.controller";
import { Router } from "express";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import { getStylePresetsSchema } from "schemas/style-preset.schema";

const stylePresetRouter = Router();

/**
 * @swagger
 * /api/v1/style-presets:
 *   get:
 *     tags:
 *       - style-presets
 *     summary: List the style presets for an image model
 *     description: Reads the preset playlist configured for the model in STYLE_PRESET_PLAYLISTS, falling back to the krea-2-turbo list. Only processed image dreams whose prompt has a style_prompt are returned, in playlist order. Empty when no playlist is configured.
 *     parameters:
 *       - name: model
 *         in: query
 *         schema:
 *           type: string
 *           example: krea-2-turbo
 *     responses:
 *       '200':
 *         description: Style presets
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         presets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/StylePreset'
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
stylePresetRouter.get(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(getStylePresetsSchema),
  stylePresetController.handleGetStylePresets,
);

export default stylePresetRouter;
