import type { RequestType, ResponseType } from "types/express.types";

describe("feature.controller", () => {
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
    const res = { status, locals: {}, cookies: {} } as unknown as ResponseType;
    return { req, res, json, status };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetFeatures returns list", async () => {
    const { req, res, json, status } = createReqRes();
    const featureRepository = {
      find: jest.fn().mockResolvedValue([{ name: "X", isActive: true }]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      featureRepository,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetFeatures } = await import(
      "controllers/feature.controller"
    );
    await handleGetFeatures(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { features: [{ name: "X", isActive: true }] },
    });
  });

  it("handleUpdateFeature updates flag and returns updated entity", async () => {
    const { req, res, json, status } = createReqRes();
    req.body = { name: "X", isActive: false };
    const featureRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 1, name: "X", isActive: true })
        .mockResolvedValueOnce({ id: 1, name: "X", isActive: false }),
      update: jest.fn().mockResolvedValue({}),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      featureRepository,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound: jest.fn(),
    }));

    const { handleUpdateFeature } = await import(
      "controllers/feature.controller"
    );
    await handleUpdateFeature(req, res);
    expect(featureRepository.update).toHaveBeenCalledWith(1, {
      isActive: false,
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { feature: { id: 1, name: "X", isActive: false } },
    });
  });
});
