import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { APP_LOGGER } from "shared/logger";
import { Socket } from "socket.io";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";
import { VoteType } from "types/vote.types";
import { handleVoteDream } from "utils/dream.util";
import {
  removeUserCurrentPlaylist,
  setUserCurrentDream,
  setUserCurrentPlaylist,
} from "utils/socket.util";

const NEW_REMOTE_CONTROL_EVENT = "new_remote_control_event";

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;
  /**
   * Temporal info log
   */
  APP_LOGGER.info(`User ${user?.cognitoId} connected to socket.io`);

  /**
   * Joins a room to avoid send all messages to all users
   */
  const roomId = "REMOTE_CONTROL:" + user.cognitoId;
  socket.join(roomId);

  socket.on(
    NEW_REMOTE_CONTROL_EVENT,
    remoteControlEventListener(socket, user, roomId),
  );
};

export const remoteControlEventListener = (
  socket: Socket,
  user: User,
  roomId: string,
) => {
  return async (data: RemoteControlEvent) => {
    // Validate incoming message against the schema
    const { error } = remoteControlSchema.validate(data);
    if (error) {
      // Validation failed, send an error response
      socket.emit("Validation error", { error: error.message });
      return;
    }
    /**
     * Temporal info log
     */

    APP_LOGGER.info(
      `User ${user?.cognitoId} sent ${NEW_REMOTE_CONTROL_EVENT}`,
      {
        data,
      },
    );

    /**
     * Get event
     */
    const event = data.event;

    /**
     * Set user current dream
     */
    if ([REMOTE_CONTROLS.PLAY_DREAM, REMOTE_CONTROLS.PLAYING].includes(event)) {
      // if event is REMOTE_CONTROLS.PLAYING, current dream will be save on user's profile on DB
      const dream = await setUserCurrentDream(
        user,
        data.uuid,
        event === REMOTE_CONTROLS.PLAYING,
      );
      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
      }

      data = { ...data, name: dream?.name };
    }

    /**
     * Set user current playlist
     */
    if (event === REMOTE_CONTROLS.PLAY_PLAYLIST) {
      const playlist = await setUserCurrentPlaylist(user, data.id);
      if (!playlist) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
      }

      data = { ...data, name: playlist?.name };
    }

    /**
     * Remove user current playlist
     */
    if (event === REMOTE_CONTROLS.RESET_PLAYLIST) {
      await removeUserCurrentPlaylist(user);
    }

    /**
     * Handles upvote/like dream
     */
    if (event === REMOTE_CONTROLS.LIKE_CURRENT_DREAM) {
      const dream = user?.currentDream;
      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
      }

      await handleVoteDream({ dream: dream!, user, voteType: VoteType.UPVOTE });
    }

    /**
     * Handles downvote/dislike dream
     */
    if (event === REMOTE_CONTROLS.DISLIKE_CURRENT_DREAM) {
      const dream = user?.currentDream;

      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
      }

      await handleVoteDream({
        dream: dream!,
        user,
        voteType: VoteType.DOWNVOTE,
      });
    }

    /**
     * Emit boradcast {NEW_REMOTE_CONTROL_EVENT} event
     */
    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
};
