export type DeviceType = "phone" | "tablet" | "desktop" | "web";

export type PresenceJoinPayload = {
  deviceId: string;
  deviceType: DeviceType;
  canPlay: boolean;
  preferredRole?: "player" | "remote" | "both" | "auto";
};

export type PresenceHeartbeatPayload = {
  deviceId: string;
};

export type RolesState = {
  version: number;
  playerDeviceId?: string | null;
  remoteDeviceId?: string | null;
};

export type RolesUpdatePayload = RolesState & {
  roles: Array<"player" | "remote">;
  playerSocketId?: string | null;
};

export type RolesRequestPayload = {
  deviceId: string;
  desired: "player" | "remote" | "both";
};

export type DeviceRecord = {
  deviceId: string;
  deviceType: DeviceType;
  canPlay: boolean;
  socketId: string;
  connectedAt: number;
  lastHeartbeat: number;
};
