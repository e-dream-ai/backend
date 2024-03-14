import { GENERAL_MESSAGES } from "constants/messages/general.constants";
import { User } from "entities";
import { remoteControlSchema } from "schemas/socket.schema";
import { Socket } from "socket.io";
import { REMOTE_CONTROLS, RemoteControlEvent } from "types/socket.types";
import { setUserCurrentDream, setUserCurrentPlaylist } from "utils/socket.util";

const NEW_REMOTE_CONTROL_EVENT = "new_remote_control_event";

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;
  /**
   * Temporal info log
   */
  console.info(`User ${user?.cognitoId} connected to socket.io`);
  socket.on(NEW_REMOTE_CONTROL_EVENT, remoteControlEventListener(socket, user));
};

export const remoteControlEventListener = (socket: Socket, user: User) => {
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
    console.info(`User ${user?.cognitoId} sent ${NEW_REMOTE_CONTROL_EVENT}`, {
      data,
    });

    const event = data.event;

    /**
     * Set user current dream
     */
    if ([REMOTE_CONTROLS.PLAY_DREAM, REMOTE_CONTROLS.PLAYING].includes(event)) {
      const dream = await setUserCurrentDream(user, data.uuid);
      if (!dream) {
        socket.emit(GENERAL_MESSAGES.ERROR, {
          error: GENERAL_MESSAGES.NOT_FOUND,
        });
      } else {
        socket.broadcast.emit(user.cognitoId, data);
      }
      return;
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
      } else {
        socket.broadcast.emit(user.cognitoId, data);
      }
      return;
    }

    /**
     * Joins a room to avoid send all messages to all users
     */
    const roomId = "user-" + user.cognitoId;
    socket.join(roomId);

    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
};
