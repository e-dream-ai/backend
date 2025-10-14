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

  it("updateHerokuFormation returns true on success and sends expected payload", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("shared/env", () => ({
        __esModule: true,
        default: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
        env: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
      }));
      const patch = jest.fn().mockResolvedValue({});
      jest.mock("axios", () => ({ __esModule: true, default: { patch } }));
      jest.mock("shared/logger", () => ({
        __esModule: true,
        APP_LOGGER: { error: jest.fn() },
      }));
      const { updateHerokuFormation } = await import("utils/job.util");
      const ok = await updateHerokuFormation({
        type: "worker",
        size: "performance-L",
        quantity: 2,
      });
      expect(ok).toBe(true);
      expect(patch).toHaveBeenCalledWith(
        "https://api.heroku.com/apps/app/formation",
        { updates: [{ type: "worker", size: "performance-L", quantity: 2 }] },
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer k" }),
        }),
      );
    });
  });

  it("updateHerokuFormation returns false on error", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("shared/env", () => ({
        __esModule: true,
        default: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
        env: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
      }));
      const patch = jest.fn().mockRejectedValue(new Error("api down"));
      const error = jest.fn();
      jest.mock("axios", () => ({ __esModule: true, default: { patch } }));
      jest.mock("shared/logger", () => ({
        __esModule: true,
        APP_LOGGER: { error },
      }));
      const { updateHerokuFormation } = await import("utils/job.util");
      const ok = await updateHerokuFormation({
        type: "worker",
        size: "performance-L",
        quantity: 0,
      });
      expect(ok).toBe(false);
      expect(error).toHaveBeenCalled();
    });
  });

  it("updateVideoServiceWorker sends worker/performance-L with quantity", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("shared/env", () => ({
        __esModule: true,
        default: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
        env: {
          HEROKU_API_URL: "https://api.heroku.com",
          VIDEO_SERVICE_APP_ID_OR_NAME: "app",
          HEROKU_APIKEY: "k",
        },
      }));
      const patch = jest.fn().mockResolvedValue({});
      jest.mock("axios", () => ({ __esModule: true, default: { patch } }));
      jest.mock("shared/logger", () => ({
        __esModule: true,
        APP_LOGGER: { error: jest.fn() },
      }));
      const { updateVideoServiceWorker } = await import("utils/job.util");
      const ok = await updateVideoServiceWorker(3);
      expect(ok).toBe(true);
      expect(patch).toHaveBeenCalledWith(
        "https://api.heroku.com/apps/app/formation",
        { updates: [{ type: "worker", size: "performance-L", quantity: 3 }] },
        expect.any(Object),
      );
    });
  });
});
