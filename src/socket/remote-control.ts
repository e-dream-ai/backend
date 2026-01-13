import { tracker } from "clients/google-analytics";
import { redisClient } from "clients/redis.client";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { APP_LOGGER } from "shared/logger";
import { Socket } from "socket.io";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";
import { VoteType } from "types/vote.types";
import { getRequestContext } from "utils/api.util";
import {
  findOneDream,
  getDreamSelectedColumns,
  handleVoteDream,
} from "utils/dream.util";
import { generateReportFromNative } from "utils/report.util";
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
const PING_EVENT_REDIS = "ping_redis";
const GOOD_BYE_EVENT = "goodbye";
const CLIENT_PRESENCE_EVENT = "client_presence";
const WEB_CLIENT_STATUS_EVENT = "web_client_status";
const STATE_SYNC_EVENT = "state_sync";
const JOIN_DREAM_ROOM_EVENT = "join_dream_room";
const LEAVE_DREAM_ROOM_EVENT = "leave_dream_room";

const sessionTracker = new SessionTracker({
  pingTimeout: 15000,
  inactivityThreshold: 40000,
  cleanupInterval: 20000,
});

const ignoredEarlyNextBySocket = new Map<string, boolean>();
const EARLY_NEXT_WINDOW_MS = 300;

const STATE_SYNC_TTL_SECONDS = 300;
const getUserStateSyncKey = (userId: number) => `user:state_sync:${userId}`;

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;

  const clientInfo = getRequestContext(socket.request.headers);

  /**
   * Create session
   */
  sessionTracker.createSession({
    socketId: socket.id,
    userUUID: user.uuid,
    clientType: clientInfo.type,
    clientVersion: clientInfo.version,
  });

  /**
   * Joins a room to avoid send all messages to all users
   */
  const roomId = "USER:" + user.id;
  socket.join(roomId);
  APP_LOGGER.info(
    `Socket ${socket.id} joined room ${roomId} in namespace ${socket.nsp.name}`,
  );

  /**
   * Helper to emit current presence (number of sockets) to the user room
   */
  const USER_WEB_ACTIVE_TTL_SECONDS = 60;
  const getUserWebActiveKey = (uuid: string) => `user:web_active:${uuid}`;

  const setUserWebActive = async (uuid: string, isActive: boolean) => {
    const key = getUserWebActiveKey(uuid);
    if (isActive) {
      await redisClient.set(key, "1", "EX", USER_WEB_ACTIVE_TTL_SECONDS);
    } else {
      await redisClient.del(key);
    }
  };

  const getUserWebActive = async (uuid: string): Promise<boolean> => {
    const key = getUserWebActiveKey(uuid);
    try {
      const v = await redisClient.get(key);
      return v === "1";
    } catch {
      return false;
    }
  };

  const emitPresence = async () => {
    try {
      const room = socket.nsp.adapter.rooms.get(roomId);
      const size = room?.size || 0;
      const hasActiveLocally = room
        ? sessionTracker.anyWebClientActive(room.values())
        : false;
      // include cached user-level active flag to avoid reconnect races
      const cachedActive = await getUserWebActive(user.uuid);
      const hasWebPlayer = Boolean(hasActiveLocally || cachedActive);

      // refresh user-level flag TTL whenever we see a local active socket
      if (hasActiveLocally) {
        await setUserWebActive(user.uuid, true);
      }
      socket.nsp.to(roomId).emit(CLIENT_PRESENCE_EVENT, {
        connectedDevices: size,
        hasWebPlayer,
      });
    } catch (err) {
      // no-op: presence is best-effort
    }
  };

  // Emit initial presence after joining
  await emitPresence();

  try {
    const lastStateJson = await redisClient.get(getUserStateSyncKey(user.id));
    if (lastStateJson) {
      const lastState = JSON.parse(lastStateJson);
      setTimeout(() => {
        socket.emit(STATE_SYNC_EVENT, lastState);
      }, 100);
    }
  } catch (error) {
    console.error("Error retrieving cached state_sync:", error);
  }

  socket.on(
    NEW_REMOTE_CONTROL_EVENT,
    handleNewControlEvent({ socket, user, roomId }),
  );

  /**
   * Register ping handler
   */
  socket.on(
    PING_EVENT,
    handlePingEvent({ socket, user, roomId, sessionTracker, emitPresence }),
  );

  /**
   * Register web client status handler
   */
  socket.on(WEB_CLIENT_STATUS_EVENT, async (payload?: { active?: boolean }) => {
    try {
      const isActive = Boolean(payload?.active);
      sessionTracker.setWebClientActive(socket.id, isActive);
      if (isActive) {
        await setUserWebActive(user.uuid, true);
      } else {
        // if no other active sockets remain for this user, clear cached flag
        const room = socket.nsp.adapter.rooms.get(roomId);
        const hasActiveLocally = room
          ? sessionTracker.anyWebClientActive(room.values())
          : false;
        if (!hasActiveLocally) {
          await setUserWebActive(user.uuid, false);
        }
      }
    } finally {
      await emitPresence();
    }
  });

  /**
   * Register ping redis handler
   */
  socket.on(PING_EVENT_REDIS, handlePingRedisEvent());

  /**
   * Register state sync handler
   */
  socket.on(STATE_SYNC_EVENT, handleStateSyncEvent({ socket, roomId, user }));

  /**
   * Register dream room handlers
   */
  socket.on(JOIN_DREAM_ROOM_EVENT, (dreamUuid: string) => {
    if (dreamUuid) {
      const dreamRoomId = `DREAM:${dreamUuid}`;
      socket.join(dreamRoomId);
      APP_LOGGER.info(`Socket ${socket.id} joined dream room ${dreamRoomId}`);
    }
  });

  socket.on(LEAVE_DREAM_ROOM_EVENT, (dreamUuid: string) => {
    if (dreamUuid) {
      const dreamRoomId = `DREAM:${dreamUuid}`;
      socket.leave(dreamRoomId);
      APP_LOGGER.info(`Socket ${socket.id} left dream room ${dreamRoomId}`);
    }
  });

  /**
   * Register goodbye handler
   */
  socket.on(GOOD_BYE_EVENT, handleGoodbyeEvent({ socket, user, roomId }));

  // Emit presence on disconnect
  socket.on("disconnect", async () => {
    ignoredEarlyNextBySocket.delete(socket.id);
    try {
      const room = socket.nsp.adapter.rooms.get(roomId);
      const hasActiveLocally = room
        ? sessionTracker.anyWebClientActive(room?.values())
        : false;
      if (!hasActiveLocally) {
        await setUserWebActive(user.uuid, false);
      }
    } finally {
      await emitPresence();
    }
  });
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
     * Ignore "next" event sent by desktop client before first ping.
     */
    try {
      const metrics = sessionTracker.getSessionMetrics(socket.id);
      const hasReceivedFirstPing = Boolean(
        metrics && metrics.lastPing > metrics.startTime,
      );
      const withinEarlyWindow = Boolean(
        metrics && Date.now() - metrics.startTime < EARLY_NEXT_WINDOW_MS,
      );

      if (
        data?.event === REMOTE_CONTROLS.GO_NEXT_DREAM &&
        data?.isWebClientEvent !== true
      ) {
        const looksAutoFromNative =
          !data?.uuid && !data?.key && typeof data?.frameNumber !== "number";

        if (!hasReceivedFirstPing && withinEarlyWindow && looksAutoFromNative) {
          const alreadyIgnored =
            ignoredEarlyNextBySocket.get(socket.id) === true;
          if (!alreadyIgnored) {
            ignoredEarlyNextBySocket.set(socket.id, true);
            return;
          }
        }
      }
    } catch {
      // no-op: ignore errors
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

      tracker.sendEventWithSocketRequestContext(
        socket,
        user.uuid,
        "DREAM_PLAYED",
        {
          dream_uuid: dream.uuid,
        },
      );

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

      tracker.sendEventWithSocketRequestContext(
        socket,
        user.uuid,
        "PLAYLIST_PLAYED",
        {
          playlist_uuid: playlist.uuid,
        },
      );

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
     * Report dream
     */
    if ([REMOTE_CONTROLS.REPORT].includes(event)) {
      // if event is REMOTE_CONTROLS.REPORT, dream will be reported creating a report on db
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

      await generateReportFromNative(user, dream);

      data = { ...data, name: dream?.name };
    }

    /**
     * Send event to GA
     */
    tracker.sendEventWithSocketRequestContext(
      socket,
      user.uuid,
      "REMOTE_CONTROL",
      {
        control: event,
      },
    );

    /**
     * Emit boradcast {NEW_REMOTE_CONTROL_EVENT} event
     */
    socket.emit(NEW_REMOTE_CONTROL_EVENT, data);
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
  emitPresence,
}: {
  user: User;
  socket: Socket;
  roomId: string;
  sessionTracker: SessionTracker;
  emitPresence: () => Promise<void>;
}) => {
  return async () => {
    /**
     * Save last client ping time
     */
    await setUserLastClientPingAt(user);

    /**
     * Send event to GA
     */
    // tracker.sendEventWithSocketRequestContext(socket, user.uuid, "CLIENT_PING", {});
    sessionTracker.handlePing(socket.id);

    /**
     * Emit boradcast {PING_EVENT} event
     */
    socket.broadcast.to(roomId).emit(PING_EVENT);

    // Update presence (best-effort)
    await emitPresence();
  };
};

/**
 * Handles a state sync event from the desktop client.
 * Forwards the state_sync data directly to the frontend without transformation.
 *
 * @param {Object} param0
 * @param {Socket} param0.socket - Socket instance.
 * @param {string} param0.roomId - Unique identifier of the room.
 * @returns void
 */
export const handleStateSyncEvent = ({
  socket,
  roomId,
  user,
}: {
  socket: Socket;
  roomId: string;
  user: User;
}) => {
  return async (data: {
    dream_uuid?: string;
    playlist?: string;
    timecode?: string;
    hud?: string;
    paused?: string;
    playback_speed?: string;
    fps?: string;
  }) => {
    try {
      const stateJson = JSON.stringify(data);
      await redisClient.set(
        getUserStateSyncKey(user.id),
        stateJson,
        "EX",
        STATE_SYNC_TTL_SECONDS,
      );

      socket.emit(STATE_SYNC_EVENT, data);
      socket.broadcast.to(roomId).emit(STATE_SYNC_EVENT, data);
    } catch (error) {
      console.error("Error handling state sync event:", error);
    }
  };
};

export const handlePingRedisEvent = () => {
  return async () => {
    const key = "TESTING_KEY";
    const value = "testingValue";
    console.time("PING REDIS SERVER");
    await redisClient.ping();
    console.timeEnd("PING REDIS SERVER");

    console.time("SAVE AND GET REDIS VALUE");

    console.time("SAVE REDIS VALUE");
    await redisClient.set(key, value);
    console.timeEnd("SAVE REDIS VALUE");

    console.time("GET REDIS VALUE");
    await redisClient.get(key);
    console.timeEnd("GET REDIS VALUE");

    console.timeEnd("SAVE AND GET REDIS VALUE");

    console.time("DELETE REDIS VALUE");
    await redisClient.del(key);
    console.timeEnd("DELETE REDIS VALUE");
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

    // Update presence (best-effort)
    try {
      const size = socket.nsp.adapter.rooms.get(roomId)?.size || 0;
      socket.nsp.to(roomId).emit(CLIENT_PRESENCE_EVENT, {
        connectedDevices: size,
      });
    } catch (err) {
      // no-op
    }
  };
};
