describe("job.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("getQueueValues returns values from redis", async () => {
    await jest.isolateModulesAsync(async () => {
      const lrange = jest.fn().mockResolvedValue(["a", "b"]);
      jest.mock("clients/redis.client", () => ({
        __esModule: true,
        redisClient: { lrange },
      }));
      jest.mock("shared/logger", () => ({
        __esModule: true,
        APP_LOGGER: { error: jest.fn() },
      }));
      const { getQueueValues } = await import("utils/job.util");
      const values = await getQueueValues("q");
      expect(values).toEqual(["a", "b"]);
      expect(lrange).toHaveBeenCalledWith("q", 0, -1);
    });
  });

  it("getQueueValues returns [] on redis error and logs", async () => {
    await jest.isolateModulesAsync(async () => {
      const lrange = jest.fn().mockRejectedValue(new Error("boom"));
      const error = jest.fn();
      jest.mock("clients/redis.client", () => ({
        __esModule: true,
        redisClient: { lrange },
      }));
      jest.mock("shared/logger", () => ({
        __esModule: true,
        APP_LOGGER: { error },
      }));
      const { getQueueValues } = await import("utils/job.util");
      const values = await getQueueValues("q");
      expect(values).toEqual([]);
      expect(error).toHaveBeenCalled();
    });
  });
});
