import { tracker } from "clients/google-analytics";
import { redisClient } from "clients/redis.client";
import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { Socket } from "socket.io";
import {
  REMOTE_CONTROLS,
  RemoteControlEvent,
  DEVICE_EVENTS,
} from "types/socket.types";
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
import { deviceSessionManager } from "./device-session-manager";
import { DeviceRegistrationData } from "types/device-session.types";

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

  /**
   * Register device registration handler
   */
  socket.on(
    DEVICE_EVENTS.REGISTER,
    handleDeviceRegister({ socket, user, roomId }),
  );

  /**
   * Register device ping handler
   */
  socket.on(DEVICE_EVENTS.PING, handleDevicePing({ socket, user }));

  /**
   * Handle disconnection
   */
  socket.on("disconnect", () => {
    handleDisconnect({ socket, user, roomId });
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

/**
 * Handles device registration from a client
 */
export const handleDeviceRegister = ({
  user,
  socket,
  roomId,
}: {
  user: User;
  socket: Socket;
  roomId: string;
}) => {
  return async (data: DeviceRegistrationData) => {
    try {
      // Register device with session manager
      const deviceSession = deviceSessionManager.registerDevice(
        socket.id,
        user.uuid,
        data,
      );

      // Get role assignments after election
      const assignments = deviceSessionManager.runElection(user.uuid);

      // Send role assignment to all devices in the room
      assignments.forEach((assignment) => {
        const devices = deviceSessionManager.getUserDevices(user.uuid);
        const targetDevice = devices.find(
          (d) => d.deviceMetadata.deviceId === assignment.deviceId,
        );

        if (targetDevice) {
          // Emit to specific device
          if (targetDevice.socketId === socket.id) {
            socket.emit(DEVICE_EVENTS.ROLE_ASSIGNED, assignment);
          } else {
            socket
              .to(targetDevice.socketId)
              .emit(DEVICE_EVENTS.ROLE_ASSIGNED, assignment);
          }
        }
      });

      // Broadcast device list update to all devices in the room
      const deviceListUpdate = deviceSessionManager.getDeviceListUpdate(
        user.uuid,
        data.deviceId,
      );

      socket.emit(DEVICE_EVENTS.LIST_UPDATED, deviceListUpdate);
      socket.broadcast
        .to(roomId)
        .emit(DEVICE_EVENTS.LIST_UPDATED, deviceListUpdate);

      // Send analytics event
      tracker.sendEventWithSocketRequestContext(
        socket,
        user.uuid,
        "CLIENT_HELLO",
        {
          device_type: data.deviceType,
          device_role: deviceSession.role,
        },
      );
    } catch (error) {
      console.error("Error registering device:", error);
      socket.emit(GENERAL_MESSAGES.ERROR, {
        error: "Failed to register device",
      });
    }
  };
};

/**
 * Handles device ping to update last seen timestamp
 */
export const handleDevicePing = ({
  socket,
}: {
  user: User;
  socket: Socket;
}) => {
  return async () => {
    deviceSessionManager.updateLastSeen(socket.id);
    socket.emit(DEVICE_EVENTS.PONG);
  };
};

/**
 * Handles socket disconnection and device cleanup
 */
export const handleDisconnect = ({
  user,
  socket,
}: {
  user: User;
  socket: Socket;
  roomId: string;
}) => {
  // Get device before unregistering
  const device = deviceSessionManager.getDeviceBySocketId(socket.id);

  if (device) {
    // Unregister device
    deviceSessionManager.unregisterDevice(socket.id, user.uuid);

    // Get remaining devices
    const remainingDevices = deviceSessionManager.getUserDevices(user.uuid);

    if (remainingDevices.length > 0) {
      // Run election for remaining devices
      const assignments = deviceSessionManager.runElection(user.uuid);

      // Notify remaining devices of role changes
      assignments.forEach((assignment) => {
        const targetDevice = remainingDevices.find(
          (d) => d.deviceMetadata.deviceId === assignment.deviceId,
        );

        if (targetDevice) {
          socket
            .to(targetDevice.socketId)
            .emit(DEVICE_EVENTS.ROLE_ASSIGNED, assignment);
        }
      });

      // Broadcast updated device list
      remainingDevices.forEach((d) => {
        const deviceListUpdate = deviceSessionManager.getDeviceListUpdate(
          user.uuid,
          d.deviceMetadata.deviceId,
        );
        socket
          .to(d.socketId)
          .emit(DEVICE_EVENTS.LIST_UPDATED, deviceListUpdate);
      });
    }
  }
};
