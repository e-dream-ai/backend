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

    const playlist = {
      id: 10,
      uuid: "p1",
      user: { id: 1 },
      thumbnail: "some-thumbnail.jpg", // Add thumbnail to avoid computePlaylistThumbnailRecursive call
    };
    const updatedPlaylist = {
      ...playlist,
      name: "New Name",
      displayedOwner: { id: 99 },
    };
    const playlistRepository = { update: jest.fn().mockResolvedValue({}) };
    const feedItemRepository = { update: jest.fn().mockResolvedValue({}) };
    const displayedOwnerUser = { id: 99 };
    const userRepository = {
      findOneBy: jest.fn().mockResolvedValue(displayedOwnerUser),
    };
    const findOnePlaylistMock = jest
      .fn()
      .mockResolvedValueOnce(playlist)
      .mockResolvedValueOnce(updatedPlaylist);

    jest.doMock("database/repositories", () => ({
      __esModule: true,
      playlistRepository,
      feedItemRepository,
      userRepository,
    }));

    jest.doMock("utils/playlist.util", () => ({
      __esModule: true,
      getPlaylistSelectedColumns: () => ({}),
      findOnePlaylist: findOnePlaylistMock,
      computePlaylistThumbnailRecursive: jest.fn(),
    }));
    jest.doMock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
      handleForbidden: jest.fn(),
      handleInternalServerError: jest.fn(),
    }));
    jest.doMock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.doMock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => true,
    }));

    jest.doMock("utils/transform.util", () => ({
      __esModule: true,
      transformCurrentPlaylistWithSignedUrls: jest
        .fn()
        .mockResolvedValue(updatedPlaylist),
    }));

    const { handleUpdatePlaylist } = await import(
      "controllers/playlist.controller"
    );
    await handleUpdatePlaylist(req, res);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 99 });
    expect(feedItemRepository.update).toHaveBeenCalledWith(
      { playlistItem: { id: playlist.id } },
      { user: displayedOwnerUser },
    );
    expect(playlistRepository.update).toHaveBeenCalledWith(
      playlist.id,
      expect.objectContaining({ displayedOwner: displayedOwnerUser }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
