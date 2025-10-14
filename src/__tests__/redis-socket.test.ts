describe("redis client config and socket helpers", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("redis client uses REDISCLOUD_URL when present", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock("shared/env", () => ({
        __esModule: true,
        default: { REDISCLOUD_URL: "redis://user:pass@host:6379" },
        env: { REDISCLOUD_URL: "redis://user:pass@host:6379" },
      }));
      const Ctor = jest.fn();
      jest.doMock("ioredis", () => ({ __esModule: true, default: Ctor }));

      const { redisClient } = await import("clients/redis.client");
      expect(redisClient).toBeDefined();
      expect(Ctor).toHaveBeenCalledWith(
        "redis://user:pass@host:6379",
        expect.objectContaining({ maxRetriesPerRequest: null }),
      );
    });
  });

  it("redis client uses host/port/password when URL missing", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock("shared/env", () => ({
        __esModule: true,
        default: { REDIS_HOST: "h", REDIS_PORT: 6380, REDIS_PASSWORD: "p" },
        env: { REDIS_HOST: "h", REDIS_PORT: 6380, REDIS_PASSWORD: "p" },
      }));
      const Ctor = jest.fn();
      jest.doMock("ioredis", () => ({ __esModule: true, default: Ctor }));

      const { redisClient } = await import("clients/redis.client");
      expect(redisClient).toBeDefined();
      expect(Ctor).toHaveBeenCalledWith(
        { host: "h", port: 6380, password: "p" },
        expect.objectContaining({ maxRetriesPerRequest: null }),
      );
    });
  });
});
