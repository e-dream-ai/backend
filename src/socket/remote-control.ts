import { User } from "entities";
import { Socket } from "socket.io";
import { Event } from "socket.io/dist/socket";

const REMOTE_CONTROL_EVENT = "remote_control_event";
const NEW_REMOTE_CONTROL_EVENT = "new_remote_control_event";

export const remoteControlConnectionListener = async (socket: Socket) => {
  const user: User = socket.data.user;
  const roomId = "user-" + user.cognitoId; // You can use another unique identifier for the user
  socket.join(roomId);
  // socket.broadcast.to(roomId).emit()
  // socket.to().
  socket.on(REMOTE_CONTROL_EVENT, remoteControlEventListener(socket, roomId));
};

export const remoteControlEventListener =
  (socket: Socket, roomId: string) => (data: Event) => {
    socket.broadcast.to(roomId).emit(NEW_REMOTE_CONTROL_EVENT, data);
  };
