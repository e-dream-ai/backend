import * as playlistController from "controllers/playlist.controller";
import { Router } from "express";
import { multerSingleFileMiddleware } from "middlewares/multer.middleware";
import { requireAuth } from "middlewares/require-auth.middleware";
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
  playlistController.handleGetMyPlaylists,
);

/**
 * Get playlist
 */
playlistRouter.get("/:id", requireAuth, playlistController.handleGetPlaylist);

/**
 * Create playlist
 */
playlistRouter.post(
  "/",
  requireAuth,
  validatorMiddleware(createPlaylistSchema),
  playlistController.handleCreatePlaylist,
);

/**
 * Update playlist
 */
playlistRouter.put(
  "/:id",
  requireAuth,
  validatorMiddleware(updatePlaylistSchema),
  playlistController.handleUpdatePlaylist,
);

/**
 * Update thumbnail
 */
playlistRouter.put(
  "/:id/thumbnail",
  requireAuth,
  multerSingleFileMiddleware,
  playlistController.handleUpdateThumbnailPlaylist,
);

/**
 * Remove playlist
 */
playlistRouter.delete(
  "/:id",
  requireAuth,
  playlistController.handleDeletePlaylist,
);

/**
 * Update playlist order
 */
playlistRouter.put(
  "/:id/order",
  requireAuth,
  validatorMiddleware(orderPlaylistSchema),
  playlistController.handleOrderPlaylist,
);

/**
 * Add item to playlist
 */
playlistRouter.put(
  "/:id/add-item",
  requireAuth,
  validatorMiddleware(addPlaylistItemSchema),
  playlistController.handleAddPlaylistItem,
);

/**
 * Remove item from playlist
 */
playlistRouter.delete(
  "/:id/remove-item/:itemId",
  requireAuth,
  playlistController.handleRemovePlaylistItem,
);

export default playlistRouter;
