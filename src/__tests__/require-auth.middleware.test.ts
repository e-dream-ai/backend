import type { NextFunction } from "express";
import type { RequestType, ResponseType } from "types/express.types";

describe("requireAuth middleware", () => {
  const createReqResNext = () => {
    const req = {
      headers: {} as Record<string, string>,
      cookies: {} as Record<string, string>,
      user: undefined as unknown,
    } as unknown as RequestType;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = {
      status,
      locals: {} as Record<string, unknown>,
      cookies: {} as Record<string, string>,
    } as unknown as ResponseType;
    const next: NextFunction = jest.fn();
    return { req, res, next, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("routes Api-Key to passport headerapikey strategy and sets user", async () => {
    const { req, res, next } = createReqResNext();
    req.headers.authorization = "Api-Key abc";

    const user = { id: 1 };
    jest.mock("passport", () => ({
      __esModule: true,
      default: {
        authenticate: jest.fn(
          (
            _s: unknown,
            _o: unknown,
            cb: (err: unknown, userObj: unknown) => void,
          ) => {
            return () => cb(null, user);
          },
        ),
      },
      authenticate: jest.fn(
        (
          _s: unknown,
          _o: unknown,
          cb: (err: unknown, userObj: unknown) => void,
        ) => {
          return () => cb(null, user);
        },
      ),
    }));

    const { requireAuth } = await import("middlewares/require-auth.middleware");
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(user);
    expect(res.locals.user).toEqual(user);
  });

  it("routes to WorkOS when cookie is present", async () => {
    const { req, res, next } = createReqResNext();
    (req as unknown as { cookies: Record<string, string> }).cookies[
      "wos-session"
    ] = "cookie";

    const mockAuth = jest
      .fn()
      .mockResolvedValue({ session: { user: { id: 1 } } });
    const mockSetCtx = jest.fn().mockResolvedValue(undefined);
    jest.mock("utils/workos.util", () => ({
      __esModule: true,
      authenticateWorkOS: mockAuth,
      setWorkOSUserContext: mockSetCtx,
      updateWorkOSCookie: jest.fn(),
      handleWorkOSAuthFailure: jest.fn(),
    }));

    const { requireAuth } = await import("middlewares/require-auth.middleware");
    await requireAuth(req, res, next);
    expect(mockAuth).toHaveBeenCalled();
    expect(mockSetCtx).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("routes Bearer to WorkOS auth", async () => {
    const { req, res, next } = createReqResNext();
    req.headers.authorization = "Bearer t";

    const mockAuth = jest
      .fn()
      .mockResolvedValue({ session: { user: { id: 1 } } });
    jest.mock("utils/workos.util", () => ({
      __esModule: true,
      authenticateWorkOS: mockAuth,
      setWorkOSUserContext: jest.fn(),
      updateWorkOSCookie: jest.fn(),
      handleWorkOSAuthFailure: jest.fn(),
    }));

    const { requireAuth } = await import("middlewares/require-auth.middleware");
    await requireAuth(req, res, next);
    expect(mockAuth).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("returns 401 with authorization url when missing credentials", async () => {
    const { req, res, next, status, json } = createReqResNext();

    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { WORKOS_AUTH_URL: "https://example" },
      env: { WORKOS_AUTH_URL: "https://example" },
    }));

    const { requireAuth } = await import("middlewares/require-auth.middleware");
    await requireAuth(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: { authorizationUrl: "https://example" },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
