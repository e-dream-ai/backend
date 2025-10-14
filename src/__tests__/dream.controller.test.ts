import type {
  LocalsType,
  RequestType,
  ResponseType,
} from "types/express.types";

describe("dream controller", () => {
  const createReqRes = (
    userOverrides: Partial<ResponseType["locals"]["user"]> = {},
  ) => {
    const req: Partial<RequestType> = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
    };

    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const user = {
      id: 1,
      uuid: "u1",
      role: { name: "user" },
      nsfw: false,
      ...userOverrides,
    };

    const res: Partial<ResponseType> = {
      status: status as unknown as (code: number) => ResponseType,
      locals: { user } as unknown as LocalsType,
      cookie: jest.fn(),
    };

    return {
      req: req as RequestType,
      res: res as ResponseType,
      json,
      status,
    };
  };

  const mockCommonUtils = (overrides: Record<string, unknown> = {}) => {
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      findDreamPlaylistItems: jest.fn().mockResolvedValue([]),
      getDreamSelectedColumns: () => ({}),
      ...(overrides["utils/dream.util"] || {}),
    }));
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      computePlaylistThumbnailRecursive: jest.fn(),
      ...(overrides["utils/playlist.util"] || {}),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformDreamWithSignedUrls: jest
        .fn()
        .mockImplementation(<T>(d: T) => d),
      transformDreamsWithSignedUrls: jest.fn().mockResolvedValue([{ id: 1 }]),
      ...(overrides["utils/transform.util"] || {}),
    }));
    jest.mock("utils/request.util", () => ({
      __esModule: true,
      isBrowserRequest: jest.fn().mockReturnValue(false),
      ...(overrides["utils/request.util"] || {}),
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: jest.fn().mockReturnValue(false),
      ...(overrides["utils/user.util"] || {}),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: <T>(p: T) => p,
      handleNotFound: jest.fn(),
      ...(overrides["utils/responses.util"] || {}),
    }));
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("hides original_video for non-owner, non-browser requests", async () => {
    const { req, res, json, status } = createReqRes();
    req.params = { uuid: "d1" };

    const dream = {
      uuid: "d1",
      user: { id: 2 },
      original_video: "orig",
      hidden: false,
    };

    jest.isolateModules(async () => {
      const dreamRepository = { findOne: jest.fn().mockResolvedValue(dream) };
      jest.mock("database/repositories", () => ({
        __esModule: true,
        dreamRepository,
        reportRepository: { find: jest.fn().mockResolvedValue([]) },
      }));

      mockCommonUtils();

      const { handleGetDream } = await import("controllers/dream.controller");
      await handleGetDream(req, res);

      expect(status).toHaveBeenCalledWith(200);
      const payload = json.mock.calls[0][0];
      expect(payload.data.dream.original_video).toBeUndefined();
    });
  });

  it("returns 404 for hidden dream and unauthorized user", async () => {
    const { req, res } = createReqRes();
    req.params = { uuid: "d1" };

    const dream = { uuid: "d1", user: { id: 2 }, hidden: true };
    const handleNotFound = jest.fn();

    jest.isolateModules(async () => {
      const dreamRepository = { findOne: jest.fn().mockResolvedValue(dream) };

      jest.mock("database/repositories", () => ({
        __esModule: true,
        dreamRepository,
        reportRepository: { find: jest.fn().mockResolvedValue([]) },
      }));

      mockCommonUtils({
        "utils/responses.util": { handleNotFound },
      });

      const { handleGetDream } = await import("controllers/dream.controller");
      await handleGetDream(req, res);

      expect(handleNotFound).toHaveBeenCalled();
    });
  });

  it("returns paginated transformed dreams", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "99999", skip: "0" };

    jest.isolateModules(async () => {
      const dreamRepository = {
        findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      };

      jest.mock("database/repositories", () => ({
        __esModule: true,
        dreamRepository,
      }));

      mockCommonUtils();

      const { handleGetDreams } = await import("controllers/dream.controller");
      await handleGetDreams(req, res);

      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({
        success: true,
        data: { dreams: [{ id: 1 }], count: 1 },
      });
    });
  });
});
