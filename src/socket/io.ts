import { Server } from "socket.io";

let io: Server | null = null;

export const setIo = (server: Server) => {
  io = server;
};

export const getIo = () => {
  return io;
};
