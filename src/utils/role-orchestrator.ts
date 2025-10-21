import Redlock from "redlock";
import { redisClient } from "clients/redis.client";
import {
  RC_SOCKET_TO_DEVICE_KEY,
  RC_USER_DEVICE_HASH_KEY,
  RC_USER_DEVICES_KEY,
  RC_USER_HEARTBEATS_KEY,
  RC_USER_ROLES_COOLDOWN_KEY,
  RC_USER_ROLES_KEY,
  RC_USER_ROLES_LOCK_KEY,
  ROLE_COOLDOWN_MS,
  ROLE_LOCK_TTL_MS,
} from "constants/roles.constants";
import {
  DeviceRecord,
  DeviceType,
  PresenceJoinPayload,
  RolesState,
} from "types/roles.types";

const redlock = new Redlock([redisClient as unknown as never], {
  retryCount: 3,
  retryDelay: 100,
});

function devicePriorityForPlayer(type: DeviceType): number {
  switch (type) {
    case "desktop":
      return 3;
    case "tablet":
      return 2;
    case "phone":
      return 1;
    default:
      return 0;
  }
}

function devicePriorityForRemote(type: DeviceType): number {
  switch (type) {
    case "phone":
      return 3;
    case "tablet":
      return 2;
    case "desktop":
      return 1;
    default:
      return 0;
  }
}

export async function getCurrentRoles(userId: string): Promise<RolesState> {
  const raw = await redisClient.get(RC_USER_ROLES_KEY(userId));
  if (!raw) return { version: 0, playerDeviceId: null, remoteDeviceId: null };
  try {
    const parsed = JSON.parse(raw) as RolesState;
    return {
      version: parsed.version ?? 0,
      playerDeviceId: parsed.playerDeviceId ?? null,
      remoteDeviceId: parsed.remoteDeviceId ?? null,
    };
  } catch {
    return { version: 0, playerDeviceId: null, remoteDeviceId: null };
  }
}

async function writeRoles(userId: string, roles: RolesState): Promise<void> {
  await redisClient.set(RC_USER_ROLES_KEY(userId), JSON.stringify(roles));
}

async function listActiveDevices(
  userId: string,
  now: number,
  staleMs: number,
): Promise<DeviceRecord[]> {
  const ids = await redisClient.smembers(RC_USER_DEVICES_KEY(userId));
  if (!ids.length) return [];
  const pipeline = redisClient.pipeline();
  ids.forEach((deviceId) =>
    pipeline.hgetall(RC_USER_DEVICE_HASH_KEY(userId, deviceId)),
  );
  const results = await pipeline.exec();
  const devices: DeviceRecord[] = [];
  results?.forEach(([, obj]) => {
    const raw = obj as Record<string, string>;
    if (!raw || !raw.deviceId) return;
    const last = Number(raw.lastHeartbeat || raw.connectedAt || 0);
    if (now - last > staleMs) return;
    devices.push({
      deviceId: raw.deviceId,
      deviceType: (raw.deviceType as DeviceType) || "web",
      canPlay: raw.canPlay === "true",
      socketId: raw.socketId,
      connectedAt: Number(raw.connectedAt || 0),
      lastHeartbeat: last,
    });
  });
  return devices;
}

export async function registerDevice({
  userId,
  payload,
  socketId,
}: {
  userId: string;
  payload: PresenceJoinPayload;
  socketId: string;
}): Promise<void> {
  const now = Date.now();
  await redisClient.sadd(RC_USER_DEVICES_KEY(userId), payload.deviceId);
  await redisClient.hmset(RC_USER_DEVICE_HASH_KEY(userId, payload.deviceId), {
    deviceId: payload.deviceId,
    deviceType: payload.deviceType,
    canPlay: String(payload.canPlay),
    preferredRole: payload.preferredRole || "auto",
    socketId,
    connectedAt: String(now),
    lastHeartbeat: String(now),
  });
  await redisClient.set(RC_SOCKET_TO_DEVICE_KEY(socketId), payload.deviceId);
  await redisClient.zadd(RC_USER_HEARTBEATS_KEY(userId), now, payload.deviceId);
}

export async function updateHeartbeat({
  userId,
  deviceId,
}: {
  userId: string;
  deviceId: string;
}): Promise<void> {
  const now = Date.now();
  await redisClient.hset(
    RC_USER_DEVICE_HASH_KEY(userId, deviceId),
    "lastHeartbeat",
    String(now),
  );
  await redisClient.zadd(RC_USER_HEARTBEATS_KEY(userId), now, deviceId);
}

export async function removeDeviceBySocket({
  userId,
  socketId,
}: {
  userId: string;
  socketId: string;
}): Promise<void> {
  const deviceId = await redisClient.get(RC_SOCKET_TO_DEVICE_KEY(socketId));
  if (!deviceId) return;
  await removeDevice({ userId, deviceId });
  await redisClient.del(RC_SOCKET_TO_DEVICE_KEY(socketId));
}

export async function removeDevice({
  userId,
  deviceId,
}: {
  userId: string;
  deviceId: string;
}): Promise<void> {
  await redisClient.srem(RC_USER_DEVICES_KEY(userId), deviceId);
  await redisClient.del(RC_USER_DEVICE_HASH_KEY(userId, deviceId));
  await redisClient.zrem(RC_USER_HEARTBEATS_KEY(userId), deviceId);
}

export async function electRoles({
  userId,
  staleMs = 15000,
}: {
  userId: string;
  staleMs?: number;
}): Promise<RolesState> {
  const lockResource = RC_USER_ROLES_LOCK_KEY(userId);
  const lock = await redlock.acquire([lockResource], ROLE_LOCK_TTL_MS);
  try {
    const now = Date.now();
    const devices = await listActiveDevices(userId, now, staleMs);
    const prev = await getCurrentRoles(userId);

    if (devices.length === 0) {
      const next = {
        version: prev.version + 1,
        playerDeviceId: null,
        remoteDeviceId: null,
      };
      await writeRoles(userId, next);
      return next;
    }

    // Single device => self-remote
    if (devices.length === 1) {
      const only = devices[0];
      const next = {
        version: prev.version + 1,
        playerDeviceId: only.deviceId,
        remoteDeviceId: only.deviceId,
      };
      await writeRoles(userId, next);
      return next;
    }

    // Multi-device: select player then remote
    const playerCandidates = devices
      .filter((d) => d.canPlay)
      .sort(
        (a, b) =>
          devicePriorityForPlayer(b.deviceType) -
            devicePriorityForPlayer(a.deviceType) ||
          a.connectedAt - b.connectedAt,
      );
    const player = playerCandidates[0] || devices[0];

    const remoteCandidates = devices
      .filter((d) => d.deviceId !== player.deviceId)
      .sort(
        (a, b) =>
          devicePriorityForRemote(b.deviceType) -
            devicePriorityForRemote(a.deviceType) ||
          a.connectedAt - b.connectedAt,
      );
    const remote = remoteCandidates[0] || player;

    // Cooldown check
    const onCooldown = Boolean(
      await redisClient.get(RC_USER_ROLES_COOLDOWN_KEY(userId)),
    );
    const playerChanged = prev.playerDeviceId !== player.deviceId;
    const remoteChanged = prev.remoteDeviceId !== remote.deviceId;
    if (onCooldown && !playerChanged && !remoteChanged) {
      return prev;
    }

    const next = {
      version: prev.version + 1,
      playerDeviceId: player.deviceId,
      remoteDeviceId: remote.deviceId,
    };
    await writeRoles(userId, next);
    await redisClient.set(
      RC_USER_ROLES_COOLDOWN_KEY(userId),
      "1",
      "PX",
      ROLE_COOLDOWN_MS,
    );
    return next;
  } finally {
    await lock.release();
  }
}

export async function resolvePlayerSocketId({
  userId,
  roles,
}: {
  userId: string;
  roles: RolesState;
}): Promise<string | null> {
  if (!roles.playerDeviceId) return null;
  const hash = await redisClient.hgetall(
    RC_USER_DEVICE_HASH_KEY(userId, roles.playerDeviceId),
  );
  const socketId = (hash && (hash as Record<string, string>).socketId) || null;
  return socketId;
}
