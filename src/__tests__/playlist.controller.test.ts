import type { RequestType, ResponseType } from "types/express.types";

describe("playlist.controller", () => {
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

  it("handleUpdatePlaylist enforces permission and updates displayedOwner for admins", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "p1";
    req.body = { name: "New Name", displayedOwner: 99 };

    const playlist = { id: 10, uuid: "p1", user: { id: 1 } };
    const playlistRepository = { update: jest.fn().mockResolvedValue({}) };
    const feedItemRepository = { update: jest.fn().mockResolvedValue({}) };
    const userRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 99 }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      playlistRepository,
      feedItemRepository,
      userRepository,
    }));

    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      getPlaylistSelectedColumns: () => ({}),
      findOnePlaylist: jest.fn().mockResolvedValue(playlist),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
      handleForbidden: jest.fn(),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => true,
    }));

    const { handleUpdatePlaylist } = await import(
      "controllers/playlist.controller"
    );
    await handleUpdatePlaylist(req, res);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 99 });
    expect(feedItemRepository.update).toHaveBeenCalledWith(
      { playlistItem: { id: playlist.id } },
      { user: { id: 99 } },
    );
    expect(playlistRepository.update).toHaveBeenCalledWith(
      playlist.id,
      expect.objectContaining({ displayedOwner: { id: 99 } }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
