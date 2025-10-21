export const PRESENCE_JOIN_EVENT = "presence:join";
export const PRESENCE_HEARTBEAT_EVENT = "presence:heartbeat";
export const ROLES_UPDATE_EVENT = "roles:update";
export const ROLES_REQUEST_EVENT = "roles:request";

export const RC_USER_DEVICES_KEY = (userId: string) =>
  `rc:user:${userId}:devices`;
export const RC_USER_DEVICE_HASH_KEY = (userId: string, deviceId: string) =>
  `rc:user:${userId}:device:${deviceId}`;
export const RC_USER_ROLES_KEY = (userId: string) => `rc:user:${userId}:roles`;
export const RC_USER_HEARTBEATS_KEY = (userId: string) =>
  `rc:user:${userId}:heartbeats`;
export const RC_SOCKET_TO_DEVICE_KEY = (socketId: string) =>
  `rc:socket:${socketId}:device`;
export const RC_USER_ROLES_LOCK_KEY = (userId: string) =>
  `rc:lock:roles:${userId}`;
export const RC_USER_ROLES_COOLDOWN_KEY = (userId: string) =>
  `rc:user:${userId}:roles:cooldown`;

export const ROLE_COOLDOWN_MS = 3000;
export const ROLE_LOCK_TTL_MS = 5000;
