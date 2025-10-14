import type { RequestType, ResponseType } from "types/express.types";

describe("playlist get endpoints", () => {
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

  it("handleGetPlaylist enforces NSFW/hidden and returns transformed with totals", async () => {
    const { req, res, json, status } = createReqRes();
    (req as unknown as { params: { uuid: string } }).params.uuid = "p1";
    const playlist = {
      id: 9,
      user: { id: 1 },
      nsfw: false,
      hidden: false,
    };
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      findOnePlaylistWithoutItems: jest.fn().mockResolvedValue(playlist),
      getPlaylistSelectedColumns: () => ({}),
      computePlaylistThumbnailRecursive: jest.fn(),
      computePlaylistTotalDurationSeconds: jest.fn().mockResolvedValue(123),
      computePlaylistTotalDreamCount: jest.fn().mockResolvedValue(7),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformPlaylistWithSignedUrls: jest
        .fn()
        .mockImplementation((p: unknown) => p),
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

    const { handleGetPlaylist } = await import(
      "controllers/playlist.controller"
    );
    await handleGetPlaylist(req, res);
    expect(status).toHaveBeenCalledWith(200);
    const payload = json.mock.calls[0][0];
    expect(payload.data.playlist.totalDurationSeconds).toBe(123);
    expect(payload.data.playlist.totalDreamCount).toBe(7);
  });
});
