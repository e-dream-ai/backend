import { ROLES } from "constants/role.constants";
import * as playlistController from "controllers/playlist.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
import { checkRoleMiddleware } from "middlewares/role.middleware";
import validatorMiddleware from "middlewares/validator.middleware";
import {
  addPlaylistItemSchema,
  createPlaylistSchema,
  orderPlaylistSchema,
  updatePlaylistSchema,
} from "schemas/playlist.schema";
const playlistRouter = Router();

/**
 * Get playlist
 */
playlistRouter.get(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleGetPlaylist,
);

/**
 * Create playlist
 */
playlistRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(createPlaylistSchema),
  playlistController.handleCreatePlaylist,
);

/**
 * Update playlist
 */
playlistRouter.put(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(updatePlaylistSchema),
  playlistController.handleUpdatePlaylist,
);

/**
 * Update thumbnail
 */
playlistRouter.put(
  "/:id/thumbnail",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  multerSingleFileMiddleware,
  playlistController.handleUpdateThumbnailPlaylist,
);

/**
 * Remove playlist
 */
playlistRouter.delete(
  "/:id",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleDeletePlaylist,
);

/**
 * Update playlist order
 */
playlistRouter.put(
  "/:id/order",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(orderPlaylistSchema),
  playlistController.handleOrderPlaylist,
);

/**
 * Add item to playlist
 */
playlistRouter.put(
  "/:id/add-item",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  validatorMiddleware(addPlaylistItemSchema),
  playlistController.handleAddPlaylistItem,
);

/**
 * Remove item from playlist
 */
playlistRouter.delete(
  "/:id/remove-item/:itemId",
  requireAuth,
  checkRoleMiddleware([
    ROLES.USER_GROUP,
    ROLES.CREATOR_GROUP,
    ROLES.ADMIN_GROUP,
  ]),
  playlistController.handleRemovePlaylistItem,
);

export default playlistRouter;
