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
  const roomId = "user-" + user.cognitoId;
  socket.join(roomId);
  socket.on(
    NEW_REMOTE_CONTROL_EVENT,
    remoteControlEventListener(socket, roomId, user),
  );
};

export const remoteControlEventListener = (
  socket: Socket,
  roomId: string,
  user: User,
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
    console.info(`User ${user?.cognitoId} sent ${NEW_REMOTE_CONTROL_EVENT}`, {
      data,
    });

    const event = data.event;

    /**
     * Set user current dream
     */
    if (
      event === REMOTE_CONTROLS.PLAY_DREAM ||
      event === REMOTE_CONTROLS.PLAYING
    ) {
      const uuid = data.uuid;
      const dream = await setUserCurrentDream(user, uuid);
      if (!dream) socket.emit("Error", { error: "Not found" });
    }

    /**
     * Set user current playlist
     */
    if (event === REMOTE_CONTROLS.PLAY_PLAYLIST) {
      const id = data.id;
      const playlist = await setUserCurrentPlaylist(user, id);
      if (!playlist) socket.emit("Error", { error: "Not found" });
    }

    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
};
