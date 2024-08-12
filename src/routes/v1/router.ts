import express, { Request, Response } from "express";
import httpStatus from "http-status";
import { errorMiddleware } from "middlewares/error.middleware";
import authRouter from "routes/v1/auth.routes";
import env from "shared/env";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import dreamRouter from "routes/v1/dream.routes";
import feedRouter from "routes/v1/feed.routes";
import playlistRouter from "routes/v1/playlist.routes";
import featureRouter from "./feature.routes";
import userRouter from "routes/v1/user.routes";
import clientRouter from "routes/v1/client.routes";
import inviteRouter from "routes/v1/invite.routes";
import { jsonResponse } from "utils/responses.util";

export const registerRoutes = (app: express.Application) => {
  const version = env.npm_package_version;

  /**
   * @swagger
   * components:
   *   schemas:
   *     Token:
   *       type: object
   *       properties:
   *         AccessToken:
   *           type: string
   *         ExpiresIn:
   *           type: integer
   *           default: 3600
   *         IdToken:
   *           type: string
   *         RefreshToken:
   *           type: string
   *         TokenType:
   *           type: string
   *           default: bearer
   *       xml:
   *         name: customer
   *     ApiResponse:
   *       type: object
   *       properties:
   *         success:
   *           type: boolean
   *           example: true
   *         message:
   *           type: string
   *         data:
   *           type: object
   *     BadApiResponse:
   *       type: object
   *       properties:
   *         success:
   *           type: boolean
   *           example: false
   *         message:
   *           type: string
   *         data:
   *           type: object
   *     Role:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *         name:
   *           type: string
   *           enum:
   *            - admin
   *            - user
   *            - creator
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *     User:
   *       type: object
   *       properties:
   *         id:
   *           type: string
   *         cognitoId:
   *           type: string
   *         name:
   *           type: string
   *         email:
   *           type: string
   *           format: email
   *         description:
   *           type: string
   *         nsfw:
   *           type: boolean
   *         role:
   *           $ref: '#/components/schemas/Role'
   *         currentDream:
   *           $ref: '#/components/schemas/Dream'
   *         currentPlaylist:
   *           $ref: '#/components/schemas/Playlist'
   *     UserWithToken:
   *       allOf:
   *         - $ref: '#/components/schemas/User'
   *         - type: object
   *           properties:
   *             token:
   *               $ref: '#/components/schemas/Token'
   *     Dream:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         uuid:
   *           type: string
   *         name:
   *           type: string
   *         video:
   *           type: string
   *         original_video:
   *           type: string
   *         thumbnail:
   *           type: string
   *         status:
   *           type: string
   *           enum:
   *            - none
   *            - queue
   *            - processing
   *            - failed
   *            - processed
   *         processedVideoSize:
   *           type: number
   *         processedVideoFrames:
   *           type: number
   *         processedVideoFPS:
   *           type: number
   *         featureRank:
   *           type: number
   *         upvotes:
   *           type: number
   *         downvotes:
   *           type: number
   *         activityLevel:
   *           type: number
   *         nsfw:
   *           type: boolean
   *         frontendUrl:
   *           type: string
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *         user:
   *           $ref: '#/components/schemas/User'
   *         displayedOwner:
   *           $ref: '#/components/schemas/User'
   *     Playlist:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         uuid:
   *           type: string
   *         name:
   *           type: string
   *         thumbnail:
   *           type: string
   *         featureRank:
   *           type: number
   *         nsfw:
   *           type: boolean
   *         items:
   *           type: array
   *           $ref: '#/components/schemas/PlaylistItem'
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *         user:
   *           $ref: '#/components/schemas/User'
   *         displayedOwner:
   *           $ref: '#/components/schemas/User'
   *     PlaylistItem:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         type:
   *           type: string
   *           enum:
   *            - none
   *            - dream
   *            - playlist
   *         dreamItem:
   *           $ref: '#/components/schemas/Dream'
   *         playlistItem:
   *           $ref: '#/components/schemas/Playlist'
   *         order:
   *           type: number
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *     FeedItem:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         type:
   *           type: string
   *           enum:
   *            - none
   *            - dream
   *            - playlist
   *         dreamItem:
   *           $ref: '#/components/schemas/Dream'
   *         playlistItem:
   *           $ref: '#/components/schemas/Playlist'
   *         order:
   *           type: number
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *         user:
   *           $ref: '#/components/schemas/User'
   *     Vote:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         type:
   *           type: string
   *           enum:
   *            - none
   *            - upvote
   *            - downvote
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *         user:
   *           $ref: '#/components/schemas/User'
   *     Invite:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         code:
   *           type: string
   *         size:
   *           type: number
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *     Feature:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         name:
   *           type: string
   *         isActive:
   *           type: boolean
   *         created_at:
   *           type: string
   *           format: date
   *         updated_at:
   *           type: string
   *           format: date
   *     Hello:
   *       type: object
   *       properties:
   *         quota:
   *           type: number
   *         currentPlaylistUUID:
   *           type: string
   *     ClientDream:
   *       type: object
   *       properties:
   *         uuid:
   *           type: string
   *         name:
   *           type: string
   *         artist:
   *           type: string
   *         size:
   *           type: number
   *         status:
   *           type: string
   *           enum:
   *            - none
   *            - queue
   *            - processing
   *            - failed
   *            - processed
   *         fps:
   *           type: number
   *         frames:
   *           type: number
   *         thumbnail:
   *           type: string
   *         upvotes:
   *           type: number
   *         downvotes:
   *           type: number
   *         nsfw:
   *           type: boolean
   *         frontendUrl:
   *           type: string
   *         timestamp:
   *           type: number
   *         video_timestamp:
   *           type: number
   *     ClientPlaylist:
   *       type: object
   *       properties:
   *         id:
   *           type: number
   *         name:
   *           type: string
   *         artist:
   *           type: string
   *         thumbnail:
   *           type: string
   *         nsfw:
   *           type: boolean
   *         contents:
   *            type: array
   *            items:
   *              type: object
   *              properties:
   *                uuid:
   *                  type: string
   *                timestamp:
   *                  type: number
   *         timestamp:
   *           type: number
   *   requestBodies: {}
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *       bearerFormat: JWT
   *     apiKeyAuth:
   *       type: apiKey
   *       in: header
   *       name: Authorization
   */

  app.get(["/", "/api/v1"], (req: Request, res: Response) => {
    res.status(httpStatus.OK).send({
      message: `e-dream.ai is running api at version ${version}`,
    });
  });

  // register feature router
  app.use("/api/v1/feature", featureRouter);

  // register user router
  app.use("/api/v1/auth", authRouter);

  // register auth router
  app.use("/api/v1/user", userRouter);

  // register dream router
  app.use("/api/v1/client", clientRouter);

  // register dream router
  app.use("/api/v1/dream", dreamRouter);

  // register playlist router
  app.use("/api/v1/playlist", playlistRouter);

  // register playlist router
  app.use("/api/v1/feed", feedRouter);

  // register playlist router
  app.use("/api/v1/invite", inviteRouter);

  app.all("*", (req, res) => {
    res.status(httpStatus.NOT_FOUND);
    if (req.accepts("json")) {
      res.json(
        jsonResponse({ success: false, message: GENERAL_MESSAGES.NOT_FOUND }),
      );
    } else {
      res.type("txt").send(GENERAL_MESSAGES.NOT_FOUND_404);
    }
  });

  app.use(errorMiddleware);
};
