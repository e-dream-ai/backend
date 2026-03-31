import type { RequestType, ResponseType } from "types/express.types";

describe("user.controller", () => {
  const createReqRes = () => {
    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
      file: undefined as unknown,
    } as unknown as RequestType;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = {
      status,
      locals: {
        user: { id: 1, uuid: "u1", role: { name: "user" }, nsfw: false },
      },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetRoles returns roles and count", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "2", skip: "0", search: "adm" };

    const roleRepository = {
      findAndCount: jest
        .fn()
        .mockResolvedValue([[{ id: 1, name: "admin" }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      roleRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getRoleSelectedColumns: () => ({}),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetRoles } = await import("controllers/user.controller");
    await handleGetRoles(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { roles: [{ id: 1, name: "admin" }], count: 1 },
    });
  });

  it("handleGetUsers returns transformed users and count", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "2", skip: "0", search: "jo", role: "user" };

    const userRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformUsersWithSignedUrls: jest.fn().mockResolvedValue([{ id: 1 }]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetUsers } = await import("controllers/user.controller");
    await handleGetUsers(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { users: [{ id: 1 }], count: 1 },
    });
  });

  it("handleGetUser masks email when not admin/owner and signs URLs", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u2";

    const user = {
      id: 2,
      uuid: "u2",
      email: "a@b.com",
      signupInvite: true,
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
      getUserFindOptionsRelations: () => ({}),
      isAdmin: () => false,
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformUserWithSignedUrls: jest
        .fn()
        .mockResolvedValue({ ...user, avatar: "signed" }),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => false,
    }));
    jest.mock("constants/role.constants", () => ({
      __esModule: true,
      ROLES: { ADMIN_GROUP: ["admin"] },
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
    }));

    const { handleGetUser } = await import("controllers/user.controller");
    await handleGetUser(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        user: expect.objectContaining({
          email: undefined,
          signupInvite: undefined,
          avatar: "signed",
        }),
      },
    });
  });

  it("handleGetAuthenticatedUser returns transformed user", async () => {
    const { req, res, json, status } = createReqRes();
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformUserWithSignedUrls: jest
        .fn()
        .mockResolvedValue({ id: 1, avatar: "signed" }),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetAuthenticatedUser } = await import(
      "controllers/user.controller"
    );
    await handleGetAuthenticatedUser(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { user: { id: 1, avatar: "signed" } },
    });
  });

  it("handleGetAuthenticatedUserPlaylist returns current playlist", async () => {
    const { req, res, json, status } = createReqRes();
    (
      res as unknown as {
        locals: { user: { currentPlaylist?: { id: number } } };
      }
    ).locals.user.currentPlaylist = { id: 99 };
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      findOnePlaylist: jest.fn().mockResolvedValue({ id: 99 }),
      getPlaylistSelectedColumns: () => ({}),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleGetAuthenticatedUserPlaylist } = await import(
      "controllers/user.controller"
    );
    await handleGetAuthenticatedUserPlaylist(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { playlist: { id: 99 } },
    });
  });

  it("handleGetUserDislikes returns dislikes list", async () => {
    const { req, res, json, status } = createReqRes();
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserDownvotedDreams: jest.fn().mockResolvedValue(["d1", "d2"]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetUserDislikes } = await import(
      "controllers/user.controller"
    );
    await handleGetUserDislikes(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { dislikes: ["d1", "d2"] },
    });
  });

  it("handleUpdateUser updates allowed fields and masks email for non-owners", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u2";
    req.body = { name: "John" };

    const existing = { id: 2, uuid: "u2", email: "e@x.com" };
    const updated = {
      id: 2,
      uuid: "u2",
      email: "e@x.com",
      name: "John",
    };
    const userRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated),
      update: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
      roleRepository: { findOneBy: jest.fn() },
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
      getUserFindOptionsRelations: () => ({}),
      isAdmin: () => false,
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformUserWithSignedUrls: jest.fn((u: unknown) =>
        Promise.resolve(u as unknown),
      ),
    }));
    jest.mock("constants/role.constants", () => ({
      __esModule: true,
      ROLES: { ADMIN_GROUP: ["admin"] },
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleForbidden: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleInternalServerError: jest.fn(() => ({
        status: () => ({ json: () => {} }),
      })),
    }));

    const { handleUpdateUser } = await import("controllers/user.controller");
    await handleUpdateUser(req, res);
    expect(userRepository.update).toHaveBeenCalledWith(2, { name: "John" });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { user: expect.any(Object) },
      }),
    );
  });

  it("handleUpdateUserAvatar uploads to R2 and saves path", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u1";
    (req as unknown as { file: { buffer: Buffer; mimetype: string } }).file = {
      buffer: Buffer.from("x"),
      mimetype: "image/jpeg",
    } as unknown as { buffer: Buffer; mimetype: string };

    const user = { id: 1, uuid: "u1" };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue({ ...user, avatar: "u1/avatar.jpeg" }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
    }));
    jest.mock("constants/multimedia.constants", () => ({
      __esModule: true,
      AVATAR: "avatar",
    }));
    jest.mock("shared/env", () => ({
      __esModule: true,
      default: { R2_BUCKET_NAME: "b" },
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
      getUserIdentifier: () => "u1",
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    const send = jest.fn().mockResolvedValue({});
    jest.mock("clients/r2.client", () => ({
      __esModule: true,
      r2Client: { send },
    }));
    jest.mock("constants/file.constants", () => ({
      __esModule: true,
      MYME_TYPES: { JPEG: "image/jpeg" },
      MYME_TYPES_EXTENSIONS: { "image/jpeg": "jpeg" },
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleForbidden: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleUpdateUserAvatar } = await import(
      "controllers/user.controller"
    );
    await handleUpdateUserAvatar(req, res);
    expect(send).toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar: expect.stringContaining("u1/avatar."),
      }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { user: expect.any(Object) },
      }),
    );
  });

  it("handleUpdateRole updates role by name", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u1";
    req.body = { role: "admin" };

    const user = { id: 1, uuid: "u1" };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue({ ...user, role: { name: "admin" } }),
    };
    const roleRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 9, name: "admin" }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
      roleRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
      getUserFindOptionsRelations: () => ({}),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleUpdateRole } = await import("controllers/user.controller");
    await handleUpdateRole(req, res);
    expect(roleRepository.findOneBy).toHaveBeenCalledWith({ name: "admin" });
    expect(userRepository.save).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { user: expect.any(Object) },
      }),
    );
  });

  it("handleGetApiKey returns decrypted key for owner", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u1";

    const user = { id: 1, uuid: "u1" };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const apiKeyRepository = {
      findOne: jest.fn().mockResolvedValue({ iv: "iv", apikey: "cipher" }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
      apiKeyRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/crypto.util", () => ({
      __esModule: true,
      decrypt: jest.fn().mockReturnValue("plain-key"),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleForbidden: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleGetApiKey } = await import("controllers/user.controller");
    await handleGetApiKey(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { apikey: { apikey: "plain-key" } },
    });
  });

  it("handleGenerateApiKey soft-removes existing and creates new", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u1";

    const user = { id: 1, uuid: "u1" };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const apiKeyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7 }),
      softRemove: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue({ id: 8 }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
      apiKeyRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("entities/ApiKey.entity", () => ({
      __esModule: true,
      ApiKey: class ApiKey {
        user: unknown;
        constructor() {
          this.user = undefined;
        }
      },
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleForbidden: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleGenerateApiKey } = await import(
      "controllers/user.controller"
    );
    await handleGenerateApiKey(req, res);
    expect(apiKeyRepository.softRemove).toHaveBeenCalledWith({ id: 7 });
    expect(apiKeyRepository.save).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true });
  });

  it("handleRevokeApiKey removes existing key", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "u1";

    const user = { id: 1, uuid: "u1" };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const apiKeyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7 }),
      softRemove: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      userRepository,
      apiKeyRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
      handleForbidden: jest.fn(() => ({ status: () => ({ json: () => {} }) })),
    }));

    const { handleRevokeApiKey } = await import("controllers/user.controller");
    await handleRevokeApiKey(req, res);
    expect(apiKeyRepository.softRemove).toHaveBeenCalledWith({ id: 7 });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true });
  });
});
