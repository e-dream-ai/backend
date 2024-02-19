import { User } from "entities";
import { Socket } from "socket.io";
import { Event } from "socket.io/dist/socket";

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

export const remoteControlEventListener =
  (socket: Socket, roomId: string, user: User) => (data: Event) => {
    /**
     * Temporal info log
     */
    console.info(`User ${user?.cognitoId} sent ${NEW_REMOTE_CONTROL_EVENT}`, {
      data,
    });
    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
