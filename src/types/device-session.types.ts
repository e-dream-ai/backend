/**
 * Device session types for multi-device role management
 */

export enum DeviceType {
  MOBILE = "mobile",
  TABLET = "tablet",
  DESKTOP = "desktop",
}

export enum DeviceRole {
  /**
   * Device acts as both remote control and video player
   */
  SELF_REMOTE = "self-remote",
  /**
   * Device acts only as remote control
   */
  REMOTE = "remote",
  /**
   * Device acts only as video player
   */
  PLAYER = "player",
}

export type DeviceMetadata = {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  userAgent: string;
};

export type DeviceSession = {
  socketId: string;
  userId: string;
  deviceMetadata: DeviceMetadata;
  role: DeviceRole;
  connectedAt: Date;
  lastSeenAt: Date;
  priority: number;
};

export type UserDeviceSessions = {
  userId: string;
  devices: Map<string, DeviceSession>;
  lastElectionAt: Date;
};

export type DeviceRegistrationData = {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  userAgent: string;
};

export type DeviceRoleAssignment = {
  deviceId: string;
  role: DeviceRole;
  reason: string;
};

export type DeviceListUpdate = {
  devices: Array<{
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    role: DeviceRole;
    isCurrentDevice: boolean;
  }>;
};
