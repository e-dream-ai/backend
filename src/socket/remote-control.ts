import { User } from "entities";
import { APP_LOGGER } from "shared/logger";
import { Socket } from "socket.io";
import { Event } from "socket.io/dist/socket";

const REMOTE_CONTROL_EVENT = "remote_control_event";
const NEW_REMOTE_CONTROL_EVENT = "new_remote_control_event";

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;
  APP_LOGGER.emit(`User ${user?.cognitoId} connected to socket.io`);
  const roomId = "user-" + user.cognitoId;
  socket.join(roomId);
  socket.on(REMOTE_CONTROL_EVENT, remoteControlEventListener(socket, roomId));
};

export const remoteControlEventListener =
  (socket: Socket, roomId: string) => (data: Event) => {
    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
