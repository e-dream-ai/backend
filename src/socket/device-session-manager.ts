/**
 * Device Session Manager
 * Handles device registration, role assignment, and session management
 */

import {
  DeviceSession,
  DeviceType,
  DeviceRole,
  UserDeviceSessions,
  DeviceMetadata,
  DeviceListUpdate,
  DeviceRoleAssignment,
} from "../types/device-session.types";

/**
 * Calculates device priority for role assignment
 * Lower number = higher priority to become remote
 */
const calculateDevicePriority = (
  deviceType: DeviceType,
  connectedAt: Date,
): number => {
  const typePriority = {
    [DeviceType.MOBILE]: 1000,
    [DeviceType.TABLET]: 2000,
    [DeviceType.DESKTOP]: 3000,
  };

  // Add timestamp component (milliseconds) to break ties
  // Earlier connections get slight priority advantage
  const timePriority = connectedAt.getTime() % 1000;

  return typePriority[deviceType] + timePriority;
};

/**
 * Determines role based on device priority and session count
 */
const determineDeviceRole = (
  device: DeviceSession,
  allDevices: DeviceSession[],
): DeviceRole => {
  // Single device: self-remote (both player and remote)
  if (allDevices.length === 1) {
    return DeviceRole.SELF_REMOTE;
  }

  // Multiple devices: highest priority becomes remote, others become players
  const sortedByPriority = [...allDevices].sort(
    (a, b) => a.priority - b.priority,
  );
  const highestPriorityDevice = sortedByPriority[0];

  if (
    device.deviceMetadata.deviceId ===
    highestPriorityDevice.deviceMetadata.deviceId
  ) {
    return DeviceRole.REMOTE;
  }

  return DeviceRole.PLAYER;
};

class DeviceSessionManager {
  /**
   * Map of userId -> UserDeviceSessions
   */
  private userSessions: Map<string, UserDeviceSessions> = new Map();

  /**
   * Grace period for reconnections (ms)
   */
  private readonly RECONNECTION_GRACE_PERIOD = 30000; // 30 seconds

  /**
   * Map of deviceId -> grace period timeout
   */
  private gracePeriodTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Registers a device session for a user
   */
  public registerDevice(
    socketId: string,
    userId: string,
    deviceMetadata: DeviceMetadata,
  ): DeviceSession {
    // Get or create user sessions
    let userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      userSessions = {
        userId,
        devices: new Map(),
        lastElectionAt: new Date(),
      };
      this.userSessions.set(userId, userSessions);
    }

    // Clear any grace period timer for this device
    const gracePeriodTimer = this.gracePeriodTimers.get(
      deviceMetadata.deviceId,
    );
    if (gracePeriodTimer) {
      clearTimeout(gracePeriodTimer);
      this.gracePeriodTimers.delete(deviceMetadata.deviceId);
    }

    // Check if device already exists (reconnection)
    const existingDevice = Array.from(userSessions.devices.values()).find(
      (d) => d.deviceMetadata.deviceId === deviceMetadata.deviceId,
    );

    const now = new Date();
    const priority = calculateDevicePriority(deviceMetadata.deviceType, now);

    let deviceSession: DeviceSession;

    if (existingDevice) {
      // Update existing device session
      deviceSession = {
        ...existingDevice,
        socketId,
        deviceMetadata,
        lastSeenAt: now,
        priority,
      };
    } else {
      // Create new device session
      deviceSession = {
        socketId,
        userId,
        deviceMetadata,
        role: DeviceRole.SELF_REMOTE, // Temporary, will be assigned by election
        connectedAt: now,
        lastSeenAt: now,
        priority,
      };
    }

    // Store device session by socketId
    userSessions.devices.set(socketId, deviceSession);

    // Run election to assign roles
    this.runElection(userId);

    return deviceSession;
  }

  /**
   * Unregisters a device session
   */
  public unregisterDevice(socketId: string, userId: string): void {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return;
    }

    const deviceSession = userSessions.devices.get(socketId);
    if (!deviceSession) {
      return;
    }

    // Remove device immediately
    userSessions.devices.delete(socketId);

    // Start grace period timer
    const timer = setTimeout(() => {
      // After grace period, run election if device hasn't reconnected
      const currentUserSessions = this.userSessions.get(userId);
      if (currentUserSessions) {
        const stillExists = Array.from(
          currentUserSessions.devices.values(),
        ).some(
          (d) =>
            d.deviceMetadata.deviceId === deviceSession.deviceMetadata.deviceId,
        );

        if (!stillExists) {
          this.runElection(userId);
        }
      }

      this.gracePeriodTimers.delete(deviceSession.deviceMetadata.deviceId);
    }, this.RECONNECTION_GRACE_PERIOD);

    this.gracePeriodTimers.set(deviceSession.deviceMetadata.deviceId, timer);

    // Run immediate election for remaining devices
    if (userSessions.devices.size > 0) {
      this.runElection(userId);
    } else {
      // No devices left, clean up user sessions
      this.userSessions.delete(userId);
    }
  }

  /**
   * Runs election to assign roles to all devices for a user
   */
  public runElection(userId: string): DeviceRoleAssignment[] {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions || userSessions.devices.size === 0) {
      return [];
    }

    const devices = Array.from(userSessions.devices.values());
    const assignments: DeviceRoleAssignment[] = [];

    // Assign roles to each device
    devices.forEach((device) => {
      const newRole = determineDeviceRole(device, devices);
      device.role = newRole;

      let reason = "";
      if (devices.length === 1) {
        reason = "Only device - acting as self-remote";
      } else if (newRole === DeviceRole.REMOTE) {
        reason = `Highest priority device (${device.deviceMetadata.deviceType})`;
      } else {
        reason = "Video player";
      }

      assignments.push({
        deviceId: device.deviceMetadata.deviceId,
        role: newRole,
        reason,
      });
    });

    userSessions.lastElectionAt = new Date();

    return assignments;
  }

  /**
   * Gets all device sessions for a user
   */
  public getUserDevices(userId: string): DeviceSession[] {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return [];
    }

    return Array.from(userSessions.devices.values());
  }

  /**
   * Gets device session by socket ID
   */
  public getDeviceBySocketId(socketId: string): DeviceSession | undefined {
    for (const userSessions of this.userSessions.values()) {
      const device = userSessions.devices.get(socketId);
      if (device) {
        return device;
      }
    }
    return undefined;
  }

  /**
   * Gets device list update for broadcasting
   */
  public getDeviceListUpdate(
    userId: string,
    currentDeviceId: string,
  ): DeviceListUpdate {
    const devices = this.getUserDevices(userId);

    return {
      devices: devices.map((d) => ({
        deviceId: d.deviceMetadata.deviceId,
        deviceName: d.deviceMetadata.deviceName,
        deviceType: d.deviceMetadata.deviceType,
        role: d.role,
        isCurrentDevice: d.deviceMetadata.deviceId === currentDeviceId,
      })),
    };
  }

  /**
   * Updates last seen timestamp for a device
   */
  public updateLastSeen(socketId: string): void {
    const device = this.getDeviceBySocketId(socketId);
    if (device) {
      device.lastSeenAt = new Date();
    }
  }

  /**
   * Cleans up stale sessions (for periodic maintenance)
   */
  public cleanupStaleSessions(timeoutMs: number = 120000): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, userSessions] of this.userSessions.entries()) {
      const devicesToRemove: string[] = [];

      for (const [socketId, device] of userSessions.devices.entries()) {
        const timeSinceLastSeen = now.getTime() - device.lastSeenAt.getTime();
        if (timeSinceLastSeen > timeoutMs) {
          devicesToRemove.push(socketId);
        }
      }

      devicesToRemove.forEach((socketId) => {
        userSessions.devices.delete(socketId);
        cleanedCount++;
      });

      // If no devices left, remove user sessions
      if (userSessions.devices.size === 0) {
        this.userSessions.delete(userId);
      } else if (devicesToRemove.length > 0) {
        // Re-run election if devices were removed
        this.runElection(userId);
      }
    }

    return cleanedCount;
  }

  /**
   * Gets total number of active sessions
   */
  public getActiveSessions(): number {
    let count = 0;
    for (const userSessions of this.userSessions.values()) {
      count += userSessions.devices.size;
    }
    return count;
  }
}

// Export singleton instance
export const deviceSessionManager = new DeviceSessionManager();
