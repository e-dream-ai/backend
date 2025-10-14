import type { JwtPayload } from "jsonwebtoken";

describe("auth.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("validateCognitoJWT throws on missing header", async () => {
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { AWS_REGION: "us-east-1", AWS_COGNITO_USER_POOL_ID: "pool" },
      env: { AWS_REGION: "us-east-1", AWS_COGNITO_USER_POOL_ID: "pool" },
    }));

    const decodeMock = jest.fn().mockReturnValue(null);
    jest.mock("jsonwebtoken", () => ({
      __esModule: true,
      default: { decode: decodeMock },
      decode: decodeMock,
    }));

    const { validateCognitoJWT } = await import("utils/auth.util");

    await expect(validateCognitoJWT("token")).rejects.toThrow("Invalid token.");
  });

  it("validateCognitoJWT returns payload on valid token", async () => {
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { AWS_REGION: "us-east-1", AWS_COGNITO_USER_POOL_ID: "pool" },
      env: { AWS_REGION: "us-east-1", AWS_COGNITO_USER_POOL_ID: "pool" },
    }));

    const decodeMock = jest.fn().mockReturnValue({ header: { kid: "kid1" } });
    const verifyMock = jest
      .fn()
      .mockReturnValue({ username: "u1" } satisfies JwtPayload as unknown);
    jest.mock("jsonwebtoken", () => ({
      __esModule: true,
      default: { decode: decodeMock, verify: verifyMock },
      decode: decodeMock,
      verify: verifyMock,
    }));

    const getSigningKey = jest
      .fn()
      .mockResolvedValue({ getPublicKey: () => "pub" });
    const jwksFactory = jest.fn().mockReturnValue({ getSigningKey });
    jest.mock("jwks-rsa", () => ({ __esModule: true, default: jwksFactory }));

    const { validateCognitoJWT } = await import("utils/auth.util");
    const payload = await validateCognitoJWT("token");

    expect(jwksFactory).toHaveBeenCalledWith({
      cache: true,
      jwksUri: expect.stringContaining("/.well-known/jwks.json"),
    });
    expect(getSigningKey).toHaveBeenCalledWith("kid1");
    expect(verifyMock).toHaveBeenCalled();
    expect(payload).toEqual({ username: "u1" });
  });

  it("validateApiKey returns userId from ENV API_KEYS", async () => {
    const apiKeys = [{ userId: 42, apiKey: "abc" }];
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { API_KEYS: apiKeys },
      env: { API_KEYS: apiKeys },
    }));

    const repo = { findOne: jest.fn() };
    const getRepository = jest.fn().mockReturnValue(repo);
    jest.mock("database/app-data-source", () => ({
      __esModule: true,
      default: { getRepository },
    }));

    jest.mock("utils/crypto.util", () => ({
      __esModule: true,
      hashApiKey: jest.fn().mockReturnValue("hash"),
    }));

    const { validateApiKey } = await import("utils/auth.util");
    const userId = await validateApiKey("abc");
    expect(userId).toBe(42);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it("validateApiKey hits DB when not found in ENV", async () => {
    const apiKeys: Array<{ userId: number; apiKey: string }> = [];
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { API_KEYS: apiKeys },
      env: { API_KEYS: apiKeys },
    }));

    const repo = { findOne: jest.fn().mockResolvedValue({ user: { id: 7 } }) };
    const getRepository = jest.fn().mockReturnValue(repo);
    jest.mock("database/app-data-source", () => ({
      __esModule: true,
      default: { getRepository },
    }));

    jest.mock("utils/crypto.util", () => ({
      __esModule: true,
      hashApiKey: jest.fn().mockReturnValue("hashed-value"),
    }));

    const { validateApiKey } = await import("utils/auth.util");
    const userId = await validateApiKey("xyz");

    expect(getRepository).toHaveBeenCalled();
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { hash: "hashed-value" },
      relations: { user: true },
    });
    expect(userId).toBe(7);
  });

  it("validateApiKey returns undefined when not found anywhere", async () => {
    const apiKeys: Array<{ userId: number; apiKey: string }> = [];
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { API_KEYS: apiKeys },
      env: { API_KEYS: apiKeys },
    }));

    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    const getRepository = jest.fn().mockReturnValue(repo);
    jest.mock("database/app-data-source", () => ({
      __esModule: true,
      default: { getRepository },
    }));

    jest.mock("utils/crypto.util", () => ({
      __esModule: true,
      hashApiKey: jest.fn().mockReturnValue("hash"),
    }));

    const { validateApiKey } = await import("utils/auth.util");
    const userId = await validateApiKey("nope");
    expect(userId).toBeUndefined();
  });
});
