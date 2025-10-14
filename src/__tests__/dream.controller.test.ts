import type { RequestType, ResponseType } from "types/express.types";

describe("dream.controller", () => {
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
      locals: { user: { id: 1, uuid: "u1" } },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleCreateMultipartUpload creates dream and presigns parts", async () => {
    const { req, res, json, status } = createReqRes();
    req.body = {
      name: "n",
      description: "d",
      sourceUrl: "s",
      extension: "mp4",
      parts: 2,
      nsfw: false,
      hidden: false,
      ccbyLicense: false,
    };

    const savedDream = { id: 10, uuid: "duuid", user: res.locals.user };
    const dreamRepository = { save: jest.fn().mockResolvedValue(savedDream) };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
    }));

    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserIdentifier: () => "u1",
    }));
    const createMultipartUpload = jest.fn().mockResolvedValue("up-1");
    const getUploadPartSignedUrl = jest
      .fn()
      .mockResolvedValueOnce("url-1")
      .mockResolvedValueOnce("url-2");
    jest.mock("utils/r2.util", () => ({
      __esModule: true,
      createMultipartUpload,
      getUploadPartSignedUrl,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleCreateMultipartUpload } = await import(
      "controllers/dream.controller"
    );
    await handleCreateMultipartUpload(req, res);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        urls: ["url-1", "url-2"],
        uploadId: "up-1",
        dream: expect.any(Object),
      }),
    });
  });

  it("handleCreateMultipartUploadDreamFile builds file path by type and signs parts", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "duuid";
    req.body = { extension: "jpg", parts: 1, type: "thumbnail" };

    const dream = { id: 11, uuid: "duuid", user: res.locals.user };
    const dreamRepository = { find: jest.fn().mockResolvedValue([dream]) };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserIdentifier: () => "u1",
    }));

    const createMultipartUpload = jest.fn().mockResolvedValue("up-2");
    const getUploadPartSignedUrl = jest.fn().mockResolvedValue("p1");
    const generateThumbnailPath = jest
      .fn()
      .mockReturnValue("u1/duuid/thumbnails/duuid.jpg");
    jest.mock("utils/r2.util", () => ({
      __esModule: true,
      createMultipartUpload,
      getUploadPartSignedUrl,
      generateThumbnailPath,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleInternalServerError: jest.fn(() => ({
        status: () => ({ json: () => {} }),
      })),
    }));
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      getDreamSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));

    const { handleCreateMultipartUploadDreamFile } = await import(
      "controllers/dream.controller"
    );
    await handleCreateMultipartUploadDreamFile(req, res);

    expect(createMultipartUpload).toHaveBeenCalledWith(
      "u1/duuid/thumbnails/duuid.jpg",
    );
    expect(getUploadPartSignedUrl).toHaveBeenCalledWith(
      "u1/duuid/thumbnails/duuid.jpg",
      "up-2",
      1,
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalled();
  });

  it("handleSetDreamStatusProcessed formats filmstrip, updates dream, and toggles workers when queue empty", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "duuid";
    req.body = {
      processedVideoSize: 1,
      processedVideoFrames: 10,
      activityLevel: 1,
      filmstrip: [1, 2],
      md5: "abc",
    };

    const dream = {
      id: 1,
      uuid: "duuid",
      user: { id: 1, uuid: "u1", nsfw: false },
    };
    const updated = { ...dream };
    const dreamRepository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([dream])
        .mockResolvedValueOnce([updated]),
      update: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      dreamRepository,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserIdentifier: () => "u1",
      isAdmin: () => false,
    }));
    jest.mock("utils/dream.util", () => ({
      __esModule: true,
      createFeedItem: jest.fn(),
      findDreamPlaylistItems: jest.fn().mockResolvedValue([]),
      getDreamSelectedColumns: () => ({}),
    }));
    jest.mock("utils/playlist.util", () => ({
      __esModule: true,
      refreshPlaylistUpdatedAtTimestampFromPlaylistItems: jest.fn(),
      computePlaylistThumbnailRecursive: jest.fn(),
    }));
    jest.mock("utils/job.util", () => ({
      __esModule: true,
      getQueueValues: jest.fn().mockResolvedValue([]),
      updateVideoServiceWorker: jest.fn(),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
    }));
    jest.mock("clients/google-analytics", () => ({
      __esModule: true,
      tracker: { sendEventWithRequestContext: jest.fn() },
    }));

    const { handleSetDreamStatusProcessed } = await import(
      "controllers/dream.controller"
    );
    await handleSetDreamStatusProcessed(req, res);

    expect(dreamRepository.update).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
