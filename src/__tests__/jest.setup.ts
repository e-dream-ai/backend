import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });
process.env.npm_package_version ||= "0.0.0-test";

jest.mock("ioredis", () => {
  class MockRedis {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._args: unknown[]) {}
    ping = jest.fn().mockResolvedValue("PONG");
    duplicate = jest.fn().mockImplementation(() => new MockRedis());
    quit = jest.fn().mockResolvedValue(undefined);
    psubscribe = jest.fn().mockResolvedValue(undefined);
    subscribe = jest.fn().mockResolvedValue(undefined);
    publish = jest.fn().mockResolvedValue(undefined);
    on = jest.fn();
    off = jest.fn();
    once = jest.fn();
    removeAllListeners = jest.fn();
  }

  return { __esModule: true, default: MockRedis };
});
