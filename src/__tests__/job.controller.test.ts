import type { RequestType, ResponseType } from "types/express.types";

describe("job.controller", () => {
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

  it("handleGetJobs returns jobs list", async () => {
    const { req, res, json, status } = createReqRes();
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
      jsonResponse: (p: unknown) => p,
    }));

    const { handleGetJobs } = await import("controllers/job.controller");
    await handleGetJobs(req, res);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, data: { jobs: ["1"] } });
  });

  it("handleTurnOn returns 200 on success, 500 on failure", async () => {
    const { req, res, json, status } = createReqRes();
    jest.mock("constants/job.constants", () => ({
      __esModule: true,
      TURN_ON_QUANTITY: 2,
    }));
    const updateVideoServiceWorker = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    jest.mock("utils/job.util", () => ({
      __esModule: true,
      updateVideoServiceWorker,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleTurnOn } = await import("controllers/job.controller");
    await handleTurnOn(req, res);
    expect(status).toHaveBeenNthCalledWith(1, 200);
    expect(json).toHaveBeenNthCalledWith(1, { success: true });

    await handleTurnOn(req, res);
    expect(status).toHaveBeenNthCalledWith(2, 500);
    expect(json).toHaveBeenNthCalledWith(2, { success: false });
  });

  it("handleTurnOff returns 200 on success, 500 on failure", async () => {
    const { req, res, json, status } = createReqRes();
    jest.mock("constants/job.constants", () => ({
      __esModule: true,
      TURN_OFF_QUANTITY: 0,
    }));
    const updateVideoServiceWorker = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    jest.mock("utils/job.util", () => ({
      __esModule: true,
      updateVideoServiceWorker,
    }));
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
    }));

    const { handleTurnOff } = await import("controllers/job.controller");
    await handleTurnOff(req, res);
    expect(status).toHaveBeenNthCalledWith(1, 200);
    expect(json).toHaveBeenNthCalledWith(1, { success: true });

    await handleTurnOff(req, res);
    expect(status).toHaveBeenNthCalledWith(2, 500);
    expect(json).toHaveBeenNthCalledWith(2, { success: false });
  });
});
