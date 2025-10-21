import { redisClient } from "clients/redis.client";

type SavePresenceArgs = {
  clientId: string;
  userId: number;
  userUUID: string;
  clientType?: string;
  clientVersion?: string;
  ttlSeconds?: number;
};

type ClientPresence = {
  clientId: string;
  userId: number;
  userUUID: string;
  clientType?: string;
  clientVersion?: string;
  updatedAt: number;
};

const DEFAULT_TTL_SECONDS: number = 30;

function getClientKey(clientId: string): string {
  return `presence:client:${clientId}`;
}

function getUserSetKey(userId: number): string {
  return `presence:user:${userId}`;
}

export class PresenceStore {
  static async saveClientPresence(args: SavePresenceArgs): Promise<void> {
    const ttlSeconds: number = args.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const presence: ClientPresence = {
      clientId: args.clientId,
      userId: args.userId,
      userUUID: args.userUUID,
      clientType: args.clientType,
      clientVersion: args.clientVersion,
      updatedAt: Date.now(),
    };
    const clientKey: string = getClientKey(args.clientId);
    const userSetKey: string = getUserSetKey(args.userId);
    await redisClient
      .multi()
      .set(clientKey, JSON.stringify(presence), "EX", ttlSeconds)
      .sadd(userSetKey, args.clientId)
      .exec();
  }

  static async touchClientPresence(
    clientId: string,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const clientKey: string = getClientKey(clientId);
    const raw: string | null = await redisClient.get(clientKey);
    if (raw) {
      try {
        const presence: ClientPresence = JSON.parse(raw) as ClientPresence;
        presence.updatedAt = Date.now();
        await redisClient.set(
          clientKey,
          JSON.stringify(presence),
          "EX",
          ttlSeconds,
        );
      } catch {
        await redisClient.expire(clientKey, ttlSeconds);
      }
    }
  }

  static async removeClientPresence(
    clientId: string,
    userId: number,
  ): Promise<void> {
    const clientKey: string = getClientKey(clientId);
    const userSetKey: string = getUserSetKey(userId);
    await redisClient.multi().del(clientKey).srem(userSetKey, clientId).exec();
  }

  static async getClientPresence(
    clientId: string,
  ): Promise<ClientPresence | null> {
    const raw: string | null = await redisClient.get(getClientKey(clientId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ClientPresence;
    } catch {
      return null;
    }
  }

  static getClientRoomId(clientId: string): string {
    return `CLIENT:${clientId}`;
  }
}
