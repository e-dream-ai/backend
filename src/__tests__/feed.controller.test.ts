import type { RequestType, ResponseType } from "types/express.types";

describe("feed.controller", () => {
  const createReqRes = () => {
    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
    } as unknown as RequestType;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = {
      status,
      locals: {
        user: { id: 1, uuid: "u1", nsfw: false, role: { name: "user" } },
      },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetFeed builds where clause, formats and transforms feed", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "10", skip: "0", search: "abc", onlyHidden: "false" };

    const feedItemRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      feedItemRepository,
    }));
    jest.mock("utils/feed.util", () => ({
      __esModule: true,
      formatFeedResponse: jest.fn().mockResolvedValue([{ id: 1 }]),
      getFeedFindOptionsRelations: jest.fn().mockReturnValue({}),
      getFeedFindOptionsWhere: jest.fn().mockReturnValue({}),
      getFeedSelectedColumns: jest.fn().mockReturnValue({}),
      groupFeedDreamItemsByPlaylist: jest.fn(),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformFeedItemsWithSignedUrls: jest
        .fn()
        .mockResolvedValue([{ id: 1 }]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));

    const { handleGetFeed } = await import("controllers/feed.controller");
    await handleGetFeed(req, res);
    expect(feedItemRepository.findAndCount).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { feed: [{ id: 1 }], count: 1 },
    });
  });

  it("handleGetRankedFeed orders by feature rank and returns feed", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "5", skip: "0" };
    const feedItemRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ id: 2 }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      feedItemRepository,
    }));
    jest.mock("utils/feed.util", () => ({
      __esModule: true,
      formatFeedResponse: jest.fn().mockResolvedValue([{ id: 2 }]),
      getFeedFindOptionsRelations: jest.fn().mockReturnValue({}),
      getFeedFindOptionsWhere: jest.fn().mockReturnValue({}),
      getFeedSelectedColumns: jest.fn().mockReturnValue({}),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformFeedItemsWithSignedUrls: jest
        .fn()
        .mockResolvedValue([{ id: 2 }]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));

    const { handleGetRankedFeed } = await import("controllers/feed.controller");
    await handleGetRankedFeed(req, res);
    expect(feedItemRepository.findAndCount).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { feed: [{ id: 2 }], count: 1 },
    });
  });
});
