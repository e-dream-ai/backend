import type { RequestType, ResponseType } from "types/express.types";

describe("job.controller", () => {
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
      locals: {},
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

  it("handleGetJobs returns jobs list", async () => {
    const { req, res, json, status } = createReqRes();

    await jest.isolateModulesAsync(async () => {
      jest.mock("constants/job.constants", () => ({
        __esModule: true,
        DEFAULT_QUEUE: "q",
      }));
      jest.mock("utils/job.util", () => ({
        __esModule: true,
        getQueueValues: jest.fn().mockResolvedValue(["1"]),
      }));
      jest.mock("utils/responses.util", () => ({
        __esModule: true,
        jsonResponse: <T>(p: T) => p,
      }));

      const { handleGetJobs } = await import("controllers/job.controller");
      await handleGetJobs(req, res);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({
        success: true,
        data: { jobs: ["1"] },
      });
    });
  });
});
