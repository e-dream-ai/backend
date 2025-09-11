import { Server } from "socket.io";
import { APP_LOGGER } from "shared/logger";
import { SocketEventData, DreamProcessedEventData } from "types/socket.types";

let ioInstance: Server | null = null;

/**
 * Set the global Socket.IO instance
 * Should be called once during server initialization
 */
export const setSocketInstance = (io: Server): void => {
  ioInstance = io;
  APP_LOGGER.info("Socket.IO instance initialized in service");
};

/**
 * Get the global Socket.IO instance
 */
export const getSocketInstance = (): Server | null => {
  return ioInstance;
};

/**
 * Emit event to a specific user's room
 * @param userId - User ID to send event to
 * @param event - Event name
 * @param data - Event data
 */
export const emitToUserRoom = (
  userId: number,
  event: string,
  data: SocketEventData,
): void => {
  if (!ioInstance) {
    APP_LOGGER.warn("Socket.IO instance not initialized, cannot emit event");
    return;
  }

  const roomId = `USER:${userId}`;
  ioInstance.of("remote-control").to(roomId).emit(event, data);
  APP_LOGGER.info(`Emitted ${event} to room ${roomId}`);
};

/**
 * Emit dream processed event to dream owner
 * @param userId - Dream owner user ID
 * @param dreamUUID - Dream UUID that was processed
 * @param dreamData - Updated dream data (optional)
 */
export const emitDreamProcessed = (
  userId: number,
  dreamUUID: string,
  dreamData?: DreamProcessedEventData["dream"],
): void => {
  emitToUserRoom(userId, "dream_processed", {
    dreamUUID,
    dream: dreamData,
  });
};
