import { tracker } from "clients/google-analytics";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { Socket } from "socket.io";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";
import { VoteType } from "types/vote.types";
import {
  findOneDream,
  getDreamSelectedColumns,
  handleVoteDream,
} from "utils/dream.util";
import { SessionTracker } from "utils/socket-session-tracker";
import {
  removeUserCurrentPlaylist,
  setUserCurrentDream,
  setUserCurrentPlaylist,
} from "utils/socket.util";
import {
  resetUserLastClientPingAt,
  setUserLastClientPingAt,
} from "utils/user.util";

const NEW_REMOTE_CONTROL_EVENT = "new_remote_control_event";
const PING_EVENT = "ping";
const GOOD_BYE_EVENT = "goodbye";

const sessionTracker = new SessionTracker({
  pingTimeout: 15000,
  inactivityThreshold: 40000,
  cleanupInterval: 20000,
});

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;

  /**
   * Create session
   */
  sessionTracker.createSession(socket.id, user.uuid);

  /**
   * Joins a room to avoid send all messages to all users
   */
  const roomId = "USER:" + user.id;
  socket.join(roomId);

  socket.on(
    NEW_REMOTE_CONTROL_EVENT,
    handleNewControlEvent({ socket, user, roomId }),
  );

  /**
   * Register ping handler
   */
  socket.on(
    PING_EVENT,
    handlePingEvent({ socket, user, roomId, sessionTracker }),
  );

  /**
   * Register goodbye handler
   */
  socket.on(GOOD_BYE_EVENT, handleGoodbyeEvent({ socket, user, roomId }));
};

export const handleNewControlEvent = ({
  user,
  socket,
  roomId,
}: {
  user: User;
  socket: Socket;
  roomId: string;
}) => {
  return async (data: RemoteControlEvent) => {
    // Validate incoming message against the schema
    const { error } = remoteControlSchema.validate(data);
    if (error) {
      // Validation failed, send an error response
      socket.emit("Validation error", { error: error.message });
      return;
    }

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
        return;
      }

      tracker.sendEvent(user.uuid, "DREAM_PLAYED", {
        dream_uuid: dream.uuid,
      });

      data = { ...data, name: dream?.name };
    }

    /**
     * Set user current playlist
     */
    if (event === REMOTE_CONTROLS.PLAY_PLAYLIST) {
      const playlist = await setUserCurrentPlaylist(user, data.uuid);
      if (!playlist) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
        return;
      }

      tracker.sendEvent(user.uuid, "PLAYLIST_PLAYED", {
        playlist_uuid: playlist.uuid,
      });

      data = { ...data, name: playlist?.name };
    }

    /**
     * Remove user current playlist
     */
    if (event === REMOTE_CONTROLS.RESET_PLAYLIST) {
      await removeUserCurrentPlaylist(user);
    }

    /**
     * Handles upvote/like current dream
     */
    if (event === REMOTE_CONTROLS.LIKE_CURRENT_DREAM) {
      const dream = user?.currentDream;
      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
        return;
      }

      data = { ...data, name: dream?.name };

      await handleVoteDream({ dream: dream!, user, voteType: VoteType.UPVOTE });
    }

    /**
     * Handles downvote/dislike current dream
     */
    if (event === REMOTE_CONTROLS.DISLIKE_CURRENT_DREAM) {
      const dream = user?.currentDream;

      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
        return;
      }

      data = { ...data, name: dream?.name };

      await handleVoteDream({
        dream: dream!,
        user,
        voteType: VoteType.DOWNVOTE,
      });
    }

    /**
     * Handles upvote/like dream
     */
    if (event === REMOTE_CONTROLS.LIKE_DREAM) {
      const uuid = data.uuid;
      const dream = await findOneDream({
        where: {
          uuid,
        },
        select: getDreamSelectedColumns(),
      });

      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
        return;
      }

      data = { ...data, name: dream?.name };

      await handleVoteDream({ dream: dream!, user, voteType: VoteType.UPVOTE });
    }

    /**
     * Handles downvote/dislike dream
     */
    if (event === REMOTE_CONTROLS.DISLIKE_DREAM) {
      const uuid = data.uuid;
      const dream = await findOneDream({
        where: {
          uuid,
        },
        select: getDreamSelectedColumns(),
      });

      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
        return;
      }

      data = { ...data, name: dream?.name };

      await handleVoteDream({
        dream: dream!,
        user,
        voteType: VoteType.DOWNVOTE,
      });
    }

    /**
     * Send event to GA
     */
    tracker.sendEvent(user.uuid, "REMOTE_CONTROL", {
      control: event,
    });

    /**
     * Emit boradcast {NEW_REMOTE_CONTROL_EVENT} event
     */
    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
};

/**
 * Handles a ping event from a client.
 *
 * @param {Object} param0
 * @param {User} param0.user - User object.
 * @param {Socket} param0.socket - Socket instance.
 * @param {string} param0.roomId - Unique identifier of the room.
 * @returns void
 */
export const handlePingEvent = ({
  user,
  socket,
  roomId,
  sessionTracker,
}: {
  user: User;
  socket: Socket;
  roomId: string;
  sessionTracker: SessionTracker;
}) => {
  return async () => {
    /**
     * Save last client ping time
     */
    await setUserLastClientPingAt(user);

    /**
     * Send event to GA
     */
    // tracker.sendEvent(user.uuid, "CLIENT_PING", {});
    sessionTracker.handlePing(socket.id);

    /**
     * Emit boradcast {PING_EVENT} event
     */
    socket.broadcast.to(roomId).emit(PING_EVENT);
  };
};

/**
 * Handles a goodbye event from a client.
 *
 * @param {Object} param0
 * @param {User} param0.user - User object.
 * @param {Socket} param0.socket - Socket instance.
 * @param {string} param0.roomId - Unique identifier of the room.
 * @returns void
 */
export const handleGoodbyeEvent = ({
  user,
  socket,
  roomId,
}: {
  user: User;
  socket: Socket;
  roomId: string;
}) => {
  return async () => {
    /**
     * Save last client ping time
     */
    await resetUserLastClientPingAt(user);

    /**
     * Emit boradcast {PING_EVENT} event
     */
    socket.broadcast.to(roomId).emit(GOOD_BYE_EVENT);
  };
};
