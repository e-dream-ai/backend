import type { RequestType, ResponseType } from "types/express.types";

describe("editor-project.controller", () => {
  const USER_ID = 7;

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
      locals: { user: { id: USER_ID, uuid: "u1", role: { name: "user" } } },
      cookies: {},
    } as unknown as ResponseType;
    return { req, res, json, status };
  };

  const mockResponses = () => {
    const handleNotFound = jest.fn();
    const handleConflict = jest.fn();
    jest.mock("utils/responses.util", () => ({
      __esModule: true,
      jsonResponse: (p: unknown) => p,
      handleNotFound,
      handleConflict,
      handleInternalServerError: (error: Error) => {
        throw error;
      },
    }));
    return { handleNotFound, handleConflict };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("scopes reads to the owner so another user's project is not found", async () => {
    const { req, res } = createReqRes();
    req.params.uuid = "someone-elses-uuid";

    const editorProjectRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      editorProjectRepository,
      playlistRepository: { findOne: jest.fn() },
      dreamRepository: { findOne: jest.fn() },
    }));
    const { handleNotFound } = mockResponses();

    const { handleGetEditorProject } = await import(
      "controllers/editor-project.controller"
    );
    await handleGetEditorProject(req, res);

    expect(editorProjectRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: "someone-elses-uuid", userId: USER_ID },
      }),
    );
    expect(handleNotFound).toHaveBeenCalled();
  });

  it("rejects a stale revision with 409 and returns the current project", async () => {
    const { req, res } = createReqRes();
    req.params.uuid = "p1";
    req.body = { revision: 1, state: { a: 1 } };

    const current = { id: 3, uuid: "p1", revision: 5, state: { b: 2 } };
    const editorProjectRepository = {
      findOne: jest.fn().mockResolvedValue(current),
      update: jest.fn(),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      editorProjectRepository,
      playlistRepository: { findOne: jest.fn() },
      dreamRepository: { findOne: jest.fn() },
    }));
    const { handleConflict } = mockResponses();

    const { handleUpdateEditorProject } = await import(
      "controllers/editor-project.controller"
    );
    await handleUpdateEditorProject(req, res);

    expect(editorProjectRepository.update).not.toHaveBeenCalled();
    expect(handleConflict).toHaveBeenCalledWith(
      req,
      res,
      expect.objectContaining({
        data: { project: { ...current, thumbnail: null, playlist: null } },
      }),
    );
  });

  it("guards the write with the revision so a lost race still conflicts", async () => {
    const { req, res } = createReqRes();
    req.params.uuid = "p1";
    req.body = { revision: 2, state: { a: 1 } };

    const editorProjectRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 3, uuid: "p1", revision: 2, state: {} }),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      editorProjectRepository,
      playlistRepository: { findOne: jest.fn() },
      dreamRepository: { findOne: jest.fn() },
    }));
    const { handleConflict } = mockResponses();

    const { handleUpdateEditorProject } = await import(
      "controllers/editor-project.controller"
    );
    await handleUpdateEditorProject(req, res);

    expect(editorProjectRepository.update).toHaveBeenCalledWith(
      { id: 3, revision: 2 },
      expect.objectContaining({ revision: 3 }),
    );
    expect(handleConflict).toHaveBeenCalled();
  });

  it("never returns state bodies from the list endpoint", async () => {
    const { req, res, status } = createReqRes();

    const editorProjectRepository = {
      findAndCount: jest.fn().mockResolvedValue([[{ uuid: "p1" }], 1]),
    };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      editorProjectRepository,
      playlistRepository: { findOne: jest.fn() },
      dreamRepository: { findOne: jest.fn() },
    }));
    mockResponses();

    const { handleGetEditorProjects } = await import(
      "controllers/editor-project.controller"
    );
    await handleGetEditorProjects(req, res);

    const args = editorProjectRepository.findAndCount.mock.calls[0][0];
    expect(args.where).toEqual({ userId: USER_ID });
    expect(args.select.state).toBeUndefined();
    expect(status).toHaveBeenCalledWith(200);
  });

  it("does not link a project to a playlist the user does not own", async () => {
    const { req, res } = createReqRes();
    req.body = {
      editorId: "flow",
      name: "n",
      state: {},
      playlistUuid: "not-mine",
    };

    const playlistRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const editorProjectRepository = { create: jest.fn(), save: jest.fn() };
    jest.mock("database/repositories", () => ({
      __esModule: true,
      editorProjectRepository,
      playlistRepository,
    }));
    const { handleNotFound } = mockResponses();

    const { handleCreateEditorProject } = await import(
      "controllers/editor-project.controller"
    );
    await handleCreateEditorProject(req, res);

    expect(playlistRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: "not-mine", userId: USER_ID },
      }),
    );
    expect(editorProjectRepository.save).not.toHaveBeenCalled();
    expect(handleNotFound).toHaveBeenCalled();
  });
});
