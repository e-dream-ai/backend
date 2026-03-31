import type {
  LocalsType,
  RequestType,
  ResponseType,
} from "types/express.types";

describe("feature.controller", () => {
  const createReqRes = () => {
    const req: Partial<RequestType> = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
    };
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res: Partial<ResponseType> = {
      status: status as unknown as (code: number) => ResponseType,
      locals: {} as unknown as LocalsType,
      cookie: jest.fn(),
    };
    return {
      req: req as RequestType,
      res: res as ResponseType,
      json,
      status,
    };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handleGetFeatures returns list", async () => {
    const { req, res, json, status } = createReqRes();
    await jest.isolateModulesAsync(async () => {
      const featureRepository = {
        find: jest.fn().mockResolvedValue([{ name: "X", isActive: true }]),
      };
      jest.mock("database/repositories", () => ({
        __esModule: true,
        featureRepository,
      }));
      jest.mock("utils/responses.util", () => ({
        __esModule: true,
        jsonResponse: <T>(p: T) => p,
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
  });

  it("handleUpdateFeature updates flag and returns updated entity", async () => {
    const { req, res, json, status } = createReqRes();
    req.body = { name: "X", isActive: false };

    await jest.isolateModulesAsync(async () => {
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
        jsonResponse: <T>(p: T) => p,
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
});
