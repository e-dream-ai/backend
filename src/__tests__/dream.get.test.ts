import type { RequestType, ResponseType } from "types/express.types";

describe("dream get endpoints", () => {
  const createReqRes = (userOverrides: Record<string, unknown> = {}) => {
    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
    } as unknown as RequestType;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const user = {
      id: 1,
      uuid: "u1",
      role: { name: "user" },
      nsfw: false,
      ...userOverrides,
    };
    const res = {
      status,
      locals: { user },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetDream returns transformed dream and hides original_video for non-owner browser false", async () => {
    const { req, res, json, status } = createReqRes();
    (req as unknown as { params: { uuid: string } }).params.uuid = "d1";
    (req as unknown as { headers: Record<string, string> }).headers = {};
    const dream = {
      uuid: "d1",
      user: { id: 2 },
      original_video: "orig",
      hidden: false,
    };
    const dreamRepository = { findOne: jest.fn().mockResolvedValue(dream) };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
      reportRepository: { find: jest.fn().mockResolvedValue([]) },
    }));
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      findDreamPlaylistItems: jest.fn().mockResolvedValue([]),
      getDreamSelectedColumns: () => ({}),
    }));
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      computePlaylistThumbnailRecursive: jest.fn(),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformDreamWithSignedUrls: jest
        .fn()
        .mockImplementation((d: unknown) => d),
    }));
    jest.mock("utils/request.util", () => ({
      __esModule: true,
      isBrowserRequest: () => false,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
    }));

    const { handleGetDream } = await import("controllers/dream.controller");
    await handleGetDream(req, res);
    expect(status).toHaveBeenCalledWith(200);
    const payload = json.mock.calls[0][0];
    expect(payload.data.dream.original_video).toBeUndefined();
  });

  it("handleGetDream returns 404 when hidden and not allowed", async () => {
    const { req, res } = createReqRes();
    (req as unknown as { params: { uuid: string } }).params.uuid = "d1";
    const dream = { uuid: "d1", user: { id: 2 }, hidden: true };
    const dreamRepository = { findOne: jest.fn().mockResolvedValue(dream) };
    const handleNotFound = jest.fn();
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
      reportRepository: { find: jest.fn().mockResolvedValue([]) },
    }));
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      findDreamPlaylistItems: jest.fn().mockResolvedValue([]),
      getDreamSelectedColumns: () => ({}),
    }));
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      computePlaylistThumbnailRecursive: jest.fn(),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformDreamWithSignedUrls: jest
        .fn()
        .mockImplementation((d: unknown) => d),
    }));
    jest.mock("utils/request.util", () => ({
      __esModule: true,
      isBrowserRequest: () => false,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound,
    }));

    const { handleGetDream } = await import("controllers/dream.controller");
    await handleGetDream(req, res);
    expect(handleNotFound).toHaveBeenCalled();
  });

  it("handleGetDreams returns paginated transformed dreams", async () => {
    const { req, res, json, status } = createReqRes();
    (req as unknown as { query: Record<string, string> }).query = {
      take: "99999",
      skip: "0",
    };
    const dreamRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
    }));
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      getDreamSelectedColumns: () => ({}),
      findDreamPlaylistItems: jest.fn(),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformDreamsWithSignedUrls: jest.fn().mockResolvedValue([{ id: 1 }]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));
    jest.mock("utils/request.util", () => ({
      __esModule: true,
      isBrowserRequest: () => false,
    }));

    const { handleGetDreams } = await import("controllers/dream.controller");
    await handleGetDreams(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { dreams: [{ id: 1 }], count: 1 },
    });
  });
});
