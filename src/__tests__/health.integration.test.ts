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
            (_req: unknown, _res: unknown, next: (err?: unknown) => void) =>
              next(),
          ),
          errorHandler: jest.fn(
            (
              err: unknown,
              _req: unknown,
              _res: unknown,
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

    jest.doMock("services/job-progress.service", () => ({
      __esModule: true,
      jobProgressService: {
        start: jest.fn(),
        stop: jest.fn().mockResolvedValue(undefined),
      },
    }));

    process.env = { ...realEnv };
    Object.assign(process.env, {
      npm_package_version: "1.0.0",
      NODE_ENV: "test",
      PORT: "8888",
      LOGGING: "false",
      LOGGING_LEVEL: "silent",
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "x",
      AWS_SECRET_ACCESS_KEY: "y",
      AWS_COGNITO_USER_POOL_ID: "pool",
      AWS_COGNITO_APP_CLIENT_ID: "client",
      R2_REGION: "auto",
      R2_ACCOUNT_ID: "acc",
      R2_ACCESS_KEY_ID: "x",
      R2_SECRET_ACCESS_KEY: "y",
      R2_BUCKET_NAME: "b",
      R2_BUCKET_URL: "https://bucket",
      AWS_SES_EMAIL_IDENTITY: "noreply@e.com",
      OPS_EMAIL: "ops@e.com",
      HEROKU_API_URL: "https://api.heroku.com",
      VIDEO_SERVICE_APP_ID_OR_NAME: "app",
      REDISCLOUD_URL: "redis://user:pass@localhost:6379",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6379",
      REDIS_PASSWORD: "pass",
      PROCESS_VIDEO_SERVER_URL: "https://video",
      PRESIGN_SERVICE_URL: "https://presign",
      PRESIGN_SERVICE_API_KEY: "k",
      TYPEORM_CONNECTION: "postgres",
      TYPEORM_DATABASE: "db",
      TYPEORM_DRIVER_EXTRA: "{}",
      TYPEORM_ENTITIES: "src/entities",
      TYPEORM_HOST: "localhost",
      TYPEORM_LOGGING: "false",
      TYPEORM_MIGRATIONS: "src/migrations",
      TYPEORM_MIGRATIONS_RUN: "false",
      TYPEORM_PASSWORD: "pass",
      TYPEORM_PORT: "5432",
      TYPEORM_SYNCHRONIZE: "false",
      TYPEORM_USERNAME: "user",
      TYPEORM_SSL: "{}",
      FRONTEND_URL: "https://frontend",
      API_KEYS: "[]",
      VIDEO_INGESTION_API_KEY: "key",
      SESSION_SECRET: "secret",
      CIPHER_KEY: "cipher",
      HEROKU_APIKEY: "hkey",
      WORKOS_CLIENT_ID: "wcid",
      WORKOS_API_KEY: "wapikey",
      WORKOS_CALLBACK_URL: "https://wos/cb",
      WORKOS_COOKIE_PASSWORD: "cookiepass",
      WORKOS_AUTH_URL: "https://wos/auth",
      WORKOS_ORGANIZATION_ID: "org",
      WORKOS_WEBHOOK_SECRET: "whsec",
      BACKEND_DOMAIN: "api.example.com",
      GA_MEASUREMENT_ID: "gaid",
      GA_API_SECRET: "gasec",
      DESIGNED_PLAYLIST_UUID: "p1",
      SHEEP_PLAYLIST_UUID: "p2",
      LOG_ROUTES: "*",
    });

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
        manager: { query: jest.fn().mockResolvedValue([{ "?column?": 1 }]) },
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
