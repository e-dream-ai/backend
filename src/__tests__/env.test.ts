describe("shared/env", () => {
  const realEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...realEnv };
  });

  afterEach(() => {
    process.env = realEnv;
  });

  it("loads required vars and parses json/bool/port/url successfully", async () => {
    process.env.npm_package_version = "1.0.0";
    process.env.NODE_ENV = "test";
    process.env.PORT = "8080";
    process.env.LOGGING = "true";
    process.env.LOGGING_LEVEL = "info";
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
    process.env.REDISCLOUD_URL = "redis://u:p@h:6379";
    process.env.REDIS_HOST = "localhost";
    process.env.REDIS_PORT = "6379";
    process.env.REDIS_PASSWORD = "p";
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

    const mod = await import("shared/env");
    const env = mod.default;

    expect(env.PORT).toBe(8080);
    expect(env.LOGGING).toBe(true);
    expect(Array.isArray(env.API_KEYS)).toBe(true);
    expect(typeof env.FRONTEND_URL).toBe("string");
    expect((env.FRONTEND_URL as string).startsWith("https://")).toBe(true);
  });

  it("throws when required variable missing", async () => {
    await jest.isolateModulesAsync(async () => {
      process.env = {} as NodeJS.ProcessEnv;
      const ce = jest.spyOn(console, "error").mockImplementation(() => {});
      const cw = jest.spyOn(console, "warn").mockImplementation(() => {});
      const exitSpy = (
        jest.spyOn(process, "exit") as jest.SpyInstance<never, [code?: number]>
      ).mockImplementation(() => {
        throw new Error("exit");
      });
      await expect(import("shared/env")).rejects.toThrow("exit");
      exitSpy.mockRestore();
      ce.mockRestore();
      cw.mockRestore();
    });
  });
});
