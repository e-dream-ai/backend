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
 * Get playlists
 */
playlistRouter.get(
  "/my-playlists",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  playlistController.handleGetMyPlaylists,
);

/**
 * Get playlist
 */
playlistRouter.get(
  "/:id",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  playlistController.handleGetPlaylist,
);

/**
 * Create playlist
 */
playlistRouter.post(
  "/",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  validatorMiddleware(createPlaylistSchema),
  playlistController.handleCreatePlaylist,
);

/**
 * Update playlist
 */
playlistRouter.put(
  "/:id",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  validatorMiddleware(updatePlaylistSchema),
  playlistController.handleUpdatePlaylist,
);

/**
 * Update thumbnail
 */
playlistRouter.put(
  "/:id/thumbnail",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  multerSingleFileMiddleware,
  playlistController.handleUpdateThumbnailPlaylist,
);

/**
 * Remove playlist
 */
playlistRouter.delete(
  "/:id",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  playlistController.handleDeletePlaylist,
);

/**
 * Update playlist order
 */
playlistRouter.put(
  "/:id/order",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  validatorMiddleware(orderPlaylistSchema),
  playlistController.handleOrderPlaylist,
);

/**
 * Add item to playlist
 */
playlistRouter.put(
  "/:id/add-item",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  validatorMiddleware(addPlaylistItemSchema),
  playlistController.handleAddPlaylistItem,
);

/**
 * Remove item from playlist
 */
playlistRouter.delete(
  "/:id/remove-item/:itemId",
  requireAuth,
  checkRoleMiddleware(["user-group", "admin-group"]),
  playlistController.handleRemovePlaylistItem,
);

export default playlistRouter;
