import { tracker } from "clients/google-analytics";
import { redisClient } from "clients/redis.client";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { Socket } from "socket.io";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";
import { VoteType } from "types/vote.types";
import { getRequestContext } from "utils/api.util";
import {
  PRESENCE_JOIN_EVENT,
  PRESENCE_HEARTBEAT_EVENT,
  ROLES_UPDATE_EVENT,
} from "constants/roles.constants";
import {
  presenceHeartbeatSchema,
  presenceJoinSchema,
} from "schemas/roles.schema";
import {
  PresenceHeartbeatPayload,
  PresenceJoinPayload,
  RolesUpdatePayload,
} from "types/roles.types";
import {
  electRoles,
  registerDevice,
  removeDeviceBySocket,
  resolvePlayerSocketId,
  updateHeartbeat,
  getCurrentRoles,
} from "utils/role-orchestrator";
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

const sessionTracker = new SessionTracker({
  pingTimeout: 15000,
  inactivityThreshold: 40000,
  cleanupInterval: 20000,
});

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
   * Register ping redis handler
   */
  socket.on(PING_EVENT_REDIS, handlePingRedisEvent());

  /**
   * Register goodbye handler
   */
  socket.on(GOOD_BYE_EVENT, handleGoodbyeEvent({ socket, user, roomId }));

  socket.on(PRESENCE_JOIN_EVENT, async (payload: PresenceJoinPayload) => {
    const { error } = presenceJoinSchema.validate(payload);
    if (error) {
      socket.emit("Validation error", { error: error.message });
      return;
    }
    await registerDevice({
      userId: String(user.id),
      payload,
      socketId: socket.id,
    });
    const roles = await electRoles({ userId: String(user.id) });
    const playerSocketId = await resolvePlayerSocketId({
      userId: String(user.id),
      roles,
    });
    const deviceRoles = (deviceId: string): RolesUpdatePayload["roles"] => {
      const isPlayer = roles.playerDeviceId === deviceId;
      const isRemote = roles.remoteDeviceId === deviceId;
      const rolesArr: Array<"player" | "remote"> = [];
      if (isPlayer) rolesArr.push("player");
      if (isRemote) rolesArr.push("remote");
      if (!rolesArr.length) rolesArr.push("remote");
      return rolesArr;
    };
    // broadcast roles to all devices in room
    socket.nsp.to(roomId).emit(ROLES_UPDATE_EVENT, {
      version: roles.version,
      playerDeviceId: roles.playerDeviceId,
      remoteDeviceId: roles.remoteDeviceId,
      playerSocketId,
    });
    // also send per-device roles to this socket
    socket.emit(ROLES_UPDATE_EVENT, {
      version: roles.version,
      roles: deviceRoles(payload.deviceId),
      playerSocketId,
    } as RolesUpdatePayload);
  });

  socket.on(
    PRESENCE_HEARTBEAT_EVENT,
    async (payload: PresenceHeartbeatPayload) => {
      const { error } = presenceHeartbeatSchema.validate(payload);
      if (error) return;
      await updateHeartbeat({
        userId: String(user.id),
        deviceId: payload.deviceId,
      });
    },
  );

  socket.on("disconnect", async () => {
    await removeDeviceBySocket({
      userId: String(user.id),
      socketId: socket.id,
    });
    const roles = await electRoles({ userId: String(user.id) });
    const playerSocketId = await resolvePlayerSocketId({
      userId: String(user.id),
      roles,
    });
    socket.nsp.to(roomId).emit(ROLES_UPDATE_EVENT, {
      version: roles.version,
      playerDeviceId: roles.playerDeviceId,
      remoteDeviceId: roles.remoteDeviceId,
      playerSocketId,
    });
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
     * Forwarding strategy:
     *  - STATUS events are broadcast to room (metrics for observers)
     *  - Other controls are sent to the elected player socket only
     *    (and echoed back to sender). Fallback to room broadcast if no player.
     */
    if (data.event === REMOTE_CONTROLS.STATUS) {
      socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
      return;
    }

    const roles = await getCurrentRoles(String(user.id));
    const playerSocketId = await resolvePlayerSocketId({
      userId: String(user.id),
      roles,
    });

    // Echo to sender for immediate UI response
    if (playerSocketId === socket.id || !playerSocketId) {
      socket.emit(NEW_REMOTE_CONTROL_EVENT, data);
    }

    if (playerSocketId && playerSocketId !== socket.id) {
      socket.nsp.to(playerSocketId).emit(NEW_REMOTE_CONTROL_EVENT, data);
    } else if (!playerSocketId) {
      // Fallback: legacy behavior
      socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
    }
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
    // tracker.sendEventWithSocketRequestContext(socket, user.uuid, "CLIENT_PING", {});
    sessionTracker.handlePing(socket.id);

    /**
     * Emit boradcast {PING_EVENT} event
     */
    socket.broadcast.to(roomId).emit(PING_EVENT);
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
  };
};
