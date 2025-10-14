import request from "supertest";

describe("/api/v1/health integration", () => {
  const realEnv = process.env;

  beforeAll(() => {
    jest.doMock("@bugsnag/js", () => ({
      __esModule: true,
      default: {
        start: jest.fn(),
        getPlugin: jest.fn().mockReturnValue({
          requestHandler: jest.fn(
            (req: unknown, res: unknown, next: (err?: unknown) => void) =>
              next(),
          ),
          errorHandler: jest.fn(
            (
              err: unknown,
              req: unknown,
              res: unknown,
              next: (e?: unknown) => void,
            ) => next(err),
          ),
        }),
      },
    }));

    jest.doMock("socket/remote-control", () => ({
      __esModule: true,
      remoteControlConnectionListener: jest.fn(),
    }));

    process.env = { ...realEnv };
    process.env.npm_package_version = "1.0.0";
    process.env.NODE_ENV = "test";
    process.env.PORT = "8888";
    process.env.LOGGING = "false";
    process.env.LOGGING_LEVEL = "silent";
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "x";
    process.env.AWS_SECRET_ACCESS_KEY = "y";
    process.env.AWS_COGNITO_USER_POOL_ID = "pool";
    process.env.AWS_COGNITO_APP_CLIENT_ID = "client";
    process.env.R2_REGION = "auto";
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.R2_ACCESS_KEY_ID = "x";
    process.env.R2_SECRET_ACCESS_KEY = "y";
    process.env.R2_BUCKET_NAME = "b";
    process.env.R2_BUCKET_URL = "https://bucket";
    process.env.AWS_SES_EMAIL_IDENTITY = "noreply@e.com";
    process.env.OPS_EMAIL = "ops@e.com";
    process.env.HEROKU_API_URL = "https://api.heroku.com";
    process.env.VIDEO_SERVICE_APP_ID_OR_NAME = "app";
    process.env.REDISCLOUD_URL = "redis://user:pass@localhost:6379";
    process.env.REDIS_HOST = "localhost";
    process.env.REDIS_PORT = "6379";
    process.env.REDIS_PASSWORD = "pass";
    process.env.PROCESS_VIDEO_SERVER_URL = "https://video";
    process.env.PRESIGN_SERVICE_URL = "https://presign";
    process.env.PRESIGN_SERVICE_API_KEY = "k";
    process.env.TYPEORM_CONNECTION = "postgres";
    process.env.TYPEORM_DATABASE = "db";
    process.env.TYPEORM_DRIVER_EXTRA = "{}";
    process.env.TYPEORM_ENTITIES = "src/entities";
    process.env.TYPEORM_HOST = "localhost";
    process.env.TYPEORM_LOGGING = "false";
    process.env.TYPEORM_MIGRATIONS = "src/migrations";
    process.env.TYPEORM_MIGRATIONS_RUN = "false";
    process.env.TYPEORM_PASSWORD = "pass";
    process.env.TYPEORM_PORT = "5432";
    process.env.TYPEORM_SYNCHRONIZE = "false";
    process.env.TYPEORM_USERNAME = "user";
    process.env.TYPEORM_SSL = "{}";
    process.env.FRONTEND_URL = "https://frontend";
    process.env.API_KEYS = "[]";
    process.env.VIDEO_INGESTION_API_KEY = "key";
    process.env.SESSION_SECRET = "secret";
    process.env.CIPHER_KEY = "cipher";
    process.env.HEROKU_APIKEY = "hkey";
    process.env.WORKOS_CLIENT_ID = "wcid";
    process.env.WORKOS_API_KEY = "wapikey";
    process.env.WORKOS_CALLBACK_URL = "https://wos/cb";
    process.env.WORKOS_COOKIE_PASSWORD = "cookiepass";
    process.env.WORKOS_AUTH_URL = "https://wos/auth";
    process.env.WORKOS_ORGANIZATION_ID = "org";
    process.env.WORKOS_WEBHOOK_SECRET = "whsec";
    process.env.BACKEND_DOMAIN = "api.example.com";
    process.env.GA_MEASUREMENT_ID = "gaid";
    process.env.GA_API_SECRET = "gasec";
    process.env.DESIGNED_PLAYLIST_UUID = "p1";
    process.env.SHEEP_PLAYLIST_UUID = "p2";
    process.env.LOG_ROUTES = "*";

    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    jest.doMock("database/app-data-source", () => ({
      __esModule: true,
      default: {
        isInitialized: true,
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
        manager: {
          query: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
        },
        getRepository: jest.fn().mockReturnValue(mockRepository),
      },
    }));

    type MockRedis = {
      ping: jest.Mock;
      duplicate: jest.Mock;
      quit: jest.Mock;
      psubscribe: jest.Mock;
      subscribe: jest.Mock;
      publish: jest.Mock;
      on: jest.Mock;
      off: jest.Mock;
      once: jest.Mock;
      removeAllListeners: jest.Mock;
    };

    const createMockRedis: () => MockRedis = () => ({
      ping: jest.fn().mockResolvedValue("PONG"),
      duplicate: jest.fn().mockImplementation(() => createMockRedis()),
      quit: jest.fn().mockResolvedValue(undefined),
      psubscribe: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
    });

    const mockRedisClient = createMockRedis();

    jest.doMock("clients/redis.client", () => ({
      __esModule: true,
      redisClient: mockRedisClient,
    }));
  });

  afterAll(() => {
    process.env = realEnv;
    jest.restoreAllMocks();
  });

  it("returns ok when db and redis are healthy", async () => {
    const serverMod = await import("server");
    const resources = await serverMod.startServer();
    const res = await request(resources.server).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.db?.ok).toBe(true);
    expect(res.body?.data?.redis?.ok).toBe(true);

    await serverMod.shutdownServer(resources);
  });
});
