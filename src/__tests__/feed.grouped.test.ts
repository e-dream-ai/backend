import type { RequestType, ResponseType } from "types/express.types";

describe("feed grouped endpoint", () => {
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

  it("handleGetGroupedFeed groups dreams into virtual playlists and filters them out", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { take: "5", skip: "0" };

    const rawFeed = [
      { id: 1, dreamItem: { uuid: "d1" } },
      { id: 2, dreamItem: { uuid: "d2" } },
    ];

    const feedItemRepository = {
      findAndCount: jest.fn().mockResolvedValue([rawFeed, 2]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      feedItemRepository,
    }));
    const groupMap = new Map<
      string,
      { id: string; dreams: Array<{ uuid: string }> }
    >();
    groupMap.set("v1", { id: "v1", dreams: [{ uuid: "d1" }] });
    jest.mock("utils/feed.util", () => ({
      __esModule: true,
      formatFeedResponse: jest.fn().mockResolvedValue(rawFeed),
      getFeedFindOptionsRelations: jest.fn().mockReturnValue({}),
      getFeedFindOptionsWhere: jest.fn().mockReturnValue({}),
      getFeedSelectedColumns: jest.fn().mockReturnValue({}),
      groupFeedDreamItemsByPlaylist: jest.fn().mockReturnValue(groupMap),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformFeedItemsWithSignedUrls: jest.fn().mockResolvedValue(rawFeed),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => false,
    }));

    const { handleGetGroupedFeed } = await import(
      "controllers/feed.controller"
    );
    await handleGetGroupedFeed(req, res);

    expect(status).toHaveBeenCalledWith(200);
    const payload = json.mock.calls[0][0];
    expect(payload.data.virtualPlaylists.length).toBe(1);
    // Feed should exclude d1 because it is grouped
    expect(
      payload.data.feedItems.find(
        (f: { dreamItem?: { uuid?: string } }) => f.dreamItem?.uuid === "d1",
      ),
    ).toBeUndefined();
    expect(payload.data.count).toBe(2);
  });
});
