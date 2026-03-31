import type { RequestType, ResponseType } from "types/express.types";

describe("keyframe.controller", () => {
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
      locals: { user: { id: 1, uuid: "u1", role: { name: "user" } } },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetKeyframe returns transformed keyframe", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "k1";
    jest.mock("utils/keyframe.util", () => ({
      __esModule: true,
      findOneKeyframe: jest.fn().mockResolvedValue({ id: 9 }),
      getKeyframeSelectedColumns: () => ({}),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformKeyframeWithSignedUrls: jest
        .fn()
        .mockResolvedValue({ id: 9, image: "signed" }),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetKeyframe } = await import(
      "controllers/keyframe.controller"
    );
    await handleGetKeyframe(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { keyframe: { id: 9, image: "signed" } },
    });
  });

  it("handleGetKeyframes returns list with count", async () => {
    const { req, res, json, status } = createReqRes();
    req.query = { userUUID: "u1", take: "2", skip: "0" };
    const keyframeRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/keyframe.util", () => ({
      __esModule: true,
      getKeyframeSelectedColumns: () => ({}),
      getKeyframeFindOptionsRelations: () => ({}),
    }));
    jest.mock("utils/transform.util", () => ({
      __esModule: true,
      transformKeyframesWithSignedUrls: jest
        .fn()
        .mockResolvedValue([{ id: 1 }]),
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetKeyframes } = await import(
      "controllers/keyframe.controller"
    );
    await handleGetKeyframes(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { keyframes: [{ id: 1 }], count: 1 },
    });
  });

  it("handleCreateKeyframe creates and returns 201", async () => {
    const { req, res, json, status } = createReqRes();
    req.body = { name: "KF" };
    const keyframeRepository = {
      save: jest.fn().mockResolvedValue({ id: 5, name: "KF" }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleCreateKeyframe } = await import(
      "controllers/keyframe.controller"
    );
    await handleCreateKeyframe(req, res);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { keyframe: { id: 5, name: "KF" } },
    });
  });

  it("handleInitKeyframeImageUpload presigns and returns uploadId", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "k1";
    req.body = { extension: "jpg" };

    const keyframe = { id: 10, uuid: "k1", user: { id: 1 } };
    const keyframeRepository = {
      find: jest.fn().mockResolvedValue([keyframe]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserIdentifier: () => "u1",
    }));
    const createMultipartUpload = jest.fn().mockResolvedValue("up-1");
    const getUploadPartSignedUrl = jest.fn().mockResolvedValue("p1");
    const generateKeyframePath = jest
      .fn()
      .mockReturnValue("u1/keyframes/k1/k1.jpg");
    jest.mock("utils/r2.util", () => ({
      __esModule: true,
      createMultipartUpload,
      getUploadPartSignedUrl,
      generateKeyframePath,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleInitKeyframeImageUpload } = await import(
      "controllers/keyframe.controller"
    );
    await handleInitKeyframeImageUpload(req, res);
    expect(createMultipartUpload).toHaveBeenCalledWith(
      "u1/keyframes/k1/k1.jpg",
    );
    expect(getUploadPartSignedUrl).toHaveBeenCalledWith(
      "u1/keyframes/k1/k1.jpg",
      "up-1",
      1,
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalled();
  });

  it("handleCompleteKeyframeImageUpload updates image and completes multipart", async () => {
    const { req, res, status } = createReqRes();
    req.params.uuid = "k1";
    req.body = {
      uploadId: "up-1",
      extension: "jpg",
      parts: [{ ETag: "e", PartNumber: 1 }],
    };

    const keyframe = { id: 10, uuid: "k1", user: { id: 1 } };
    const keyframeRepository = {
      find: jest.fn().mockResolvedValue([keyframe]),
      update: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      getUserIdentifier: () => "u1",
    }));
    const completeMultipartUpload = jest.fn().mockResolvedValue({});
    const generateKeyframePath = jest
      .fn()
      .mockReturnValue("u1/keyframes/k1/k1.jpg");
    jest.mock("utils/r2.util", () => ({
      __esModule: true,
      completeMultipartUpload,
      generateKeyframePath,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleCompleteKeyframeImageUpload } = await import(
      "controllers/keyframe.controller"
    );
    await handleCompleteKeyframeImageUpload(req, res);
    expect(keyframeRepository.update).toHaveBeenCalledWith(10, {
      image: "u1/keyframes/k1/k1.jpg",
    });
    expect(completeMultipartUpload).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(201);
  });

  it("handleUpdateKeyframe updates fields and displayedOwner for admin", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "k1";
    req.body = { name: "New KF", displayedOwner: 99 };
    const keyframe = { id: 15, user: { id: 1 } };
    const updated = {
      id: 15,
      name: "New KF",
      displayedOwner: { id: 99 },
    };
    const keyframeRepository = { update: jest.fn().mockResolvedValue({}) };
    const userRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 99 }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
      userRepository,
    }));
    jest.mock("utils/keyframe.util", () => ({
      __esModule: true,
      findOneKeyframe: jest
        .fn()
        .mockResolvedValueOnce(keyframe)
        .mockResolvedValueOnce(updated),
      getKeyframeSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/user.util", () => ({
      __esModule: true,
      isAdmin: () => true,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleUpdateKeyframe } = await import(
      "controllers/keyframe.controller"
    );
    await handleUpdateKeyframe(req, res);
    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: 99 });
    expect(keyframeRepository.update).toHaveBeenCalledWith(
      15,
      expect.objectContaining({ displayedOwner: { id: 99 } }),
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("handleDeleteImageKeyframe clears image when permitted", async () => {
    const { req, res, status } = createReqRes();
    req.params.uuid = "k1";
    const keyframeRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/keyframe.util", () => ({
      __esModule: true,
      findOneKeyframe: jest.fn().mockResolvedValue({ id: 7, user: { id: 1 } }),
      getKeyframeSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleDeleteImageKeyframe } = await import(
      "controllers/keyframe.controller"
    );
    await handleDeleteImageKeyframe(req, res);
    expect(keyframeRepository.update).toHaveBeenCalledWith(7, { image: null });
    expect(status).toHaveBeenCalledWith(200);
  });

  it("handleDeleteKeyframe soft removes when permitted", async () => {
    const { req, res, json, status } = createReqRes();
    req.params.uuid = "k1";
    const keyframeRepository = {
      softRemove: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      keyframeRepository,
    }));
    jest.mock("utils/keyframe.util", () => ({
      __esModule: true,
      findOneKeyframe: jest.fn().mockResolvedValue({ id: 7, user: { id: 1 } }),
      getKeyframeSelectedColumns: () => ({}),
    }));
    jest.mock("utils/permissions.util", () => ({
      __esModule: true,
      canExecuteAction: () => true,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleDeleteKeyframe } = await import(
      "controllers/keyframe.controller"
    );
    await handleDeleteKeyframe(req, res);
    expect(keyframeRepository.softRemove).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true });
  });
});
