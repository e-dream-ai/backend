import httpStatus from "http-status";
import { ILike, QueryFailedError } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { EditorProject } from "entities";
import { PAGINATION } from "constants/pagination.constants";
import { EDITOR_PROJECT_MESSAGES } from "constants/editor-project.constants";
import { RequestType, ResponseType } from "types/express.types";
import {
  CreateEditorProjectRequest,
  EditorProjectParamsRequest,
  EditorProjectState,
  GetEditorProjectsQuery,
  UpdateEditorProjectRequest,
} from "types/editor-project.types";
import {
  dreamRepository,
  editorProjectRepository,
  playlistRepository,
} from "database/repositories";
import {
  getEditorProjectRelations,
  getEditorProjectSelectedColumns,
  getEditorProjectSummaryColumns,
  toEditorProjectResponse,
  toEditorProjectResponses,
} from "utils/editor-project.util";
import {
  handleConflict,
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";

const POSTGRES_UNIQUE_VIOLATION = "23505";

const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error.driverError as { code?: string })?.code === POSTGRES_UNIQUE_VIOLATION;

type PlaylistResolution =
  | { status: "unchanged" }
  | { status: "resolved"; playlistId: number | null }
  | { status: "notFound" };

const findOwnedPlaylistId = async (
  playlistUuid: string,
  userId: number,
): Promise<number | undefined> => {
  const playlist = await playlistRepository.findOne({
    where: { uuid: playlistUuid, userId },
    select: { id: true },
  });

  return playlist?.id;
};

const resolvePlaylist = async (
  playlistUuid: string | null | undefined,
  userId: number,
): Promise<PlaylistResolution> => {
  if (playlistUuid === undefined) return { status: "unchanged" };
  if (playlistUuid === null) return { status: "resolved", playlistId: null };

  const playlistId = await findOwnedPlaylistId(playlistUuid, userId);

  return playlistId === undefined
    ? { status: "notFound" }
    : { status: "resolved", playlistId };
};

const resolveThumbnailDreamId = async (
  dreamUuid: string | null | undefined,
): Promise<number | null | undefined> => {
  if (dreamUuid === undefined) return undefined;
  if (dreamUuid === null) return null;

  const dream = await dreamRepository.findOne({
    where: { uuid: dreamUuid },
    select: { id: true },
  });

  return dream?.id ?? null;
};

export const handleGetEditorProjects = async (
  req: RequestType<unknown, GetEditorProjectsQuery>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const { editorId, playlistUuid, search } = req.query;
  const take = Number(req.query.take ?? PAGINATION.TAKE);
  const skip = Number(req.query.skip ?? PAGINATION.SKIP);

  try {
    let playlistId: number | undefined;

    if (playlistUuid) {
      playlistId = await findOwnedPlaylistId(playlistUuid, user.id);

      if (playlistId === undefined) {
        return res.status(httpStatus.OK).json(
          jsonResponse({
            success: true,
            data: { projects: [], count: 0 },
          }),
        );
      }
    }

    const [projects, count] = await editorProjectRepository.findAndCount({
      where: {
        userId: user.id,
        ...(editorId ? { editorId } : {}),
        ...(playlistId !== undefined ? { playlistId } : {}),
        ...(search ? { name: ILike(`%${escapeLikePattern(search)}%`) } : {}),
      },
      select: getEditorProjectSummaryColumns(),
      relations: getEditorProjectRelations(),
      order: { updated_at: "DESC" },
      take,
      skip,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { projects: toEditorProjectResponses(projects), count },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleGetEditorProject = async (
  req: RequestType<unknown, unknown, EditorProjectParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: getEditorProjectSelectedColumns(),
      relations: getEditorProjectRelations(),
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { project: toEditorProjectResponse(project) },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleCreateEditorProject = async (
  req: RequestType<CreateEditorProjectRequest>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const body = req.body as CreateEditorProjectRequest;

  try {
    const playlist = await resolvePlaylist(body.playlistUuid, user.id);

    if (playlist.status === "notFound") {
      return handleNotFound(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.PLAYLIST_NOT_FOUND,
      });
    }

    const project = editorProjectRepository.create({
      userId: user.id,
      editorId: body.editorId,
      name: body.name,
      state: body.state,
      schemaVersion: body.schemaVersion ?? 1,
      thumbnailDreamId:
        (await resolveThumbnailDreamId(body.thumbnailDreamUuid)) ?? null,
      playlistId: playlist.status === "resolved" ? playlist.playlistId : null,
    });

    const saved = await editorProjectRepository.save(project);

    const created = await editorProjectRepository.findOne({
      where: { id: saved.id },
      select: getEditorProjectSelectedColumns(),
      relations: getEditorProjectRelations(),
    });

    return res.status(httpStatus.CREATED).json(
      jsonResponse({
        success: true,
        data: { project: created ? toEditorProjectResponse(created) : saved },
      }),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return handleConflict(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.NAME_TAKEN,
      });
    }

    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleUpdateEditorProject = async (
  req: RequestType<
    UpdateEditorProjectRequest,
    unknown,
    EditorProjectParamsRequest
  >,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const body = req.body as UpdateEditorProjectRequest;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: getEditorProjectSelectedColumns(),
      relations: getEditorProjectRelations(),
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    if (project.revision !== body.revision) {
      return handleConflict(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.REVISION_CONFLICT,
        data: { project: toEditorProjectResponse(project) },
      });
    }

    const playlist = await resolvePlaylist(body.playlistUuid, user.id);

    if (playlist.status === "notFound") {
      return handleNotFound(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.PLAYLIST_NOT_FOUND,
      });
    }

    const updates: QueryDeepPartialEntity<EditorProject> = {
      revision: project.revision + 1,
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.state !== undefined) {
      updates.state = body.state as QueryDeepPartialEntity<EditorProjectState>;
    }
    if (body.schemaVersion !== undefined)
      updates.schemaVersion = body.schemaVersion;
    const thumbnailDreamId = await resolveThumbnailDreamId(
      body.thumbnailDreamUuid,
    );
    if (thumbnailDreamId !== undefined) {
      updates.thumbnailDreamId = thumbnailDreamId;
    }
    if (playlist.status === "resolved") {
      updates.playlistId = playlist.playlistId;
    }

    const result = await editorProjectRepository.update(
      { id: project.id, revision: body.revision },
      updates,
    );

    if (!result.affected) {
      const current = await editorProjectRepository.findOne({
        where: { uuid, userId: user.id },
        select: getEditorProjectSelectedColumns(),
        relations: getEditorProjectRelations(),
      });

      return handleConflict(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.REVISION_CONFLICT,
        ...(current
          ? { data: { project: toEditorProjectResponse(current) } }
          : {}),
      });
    }

    const updated = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: getEditorProjectSelectedColumns(),
      relations: getEditorProjectRelations(),
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { project: updated ? toEditorProjectResponse(updated) : null },
      }),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return handleConflict(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.NAME_TAKEN,
      });
    }

    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleDeleteEditorProject = async (
  req: RequestType<unknown, unknown, EditorProjectParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: { id: true },
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    await editorProjectRepository.softDelete({ id: project.id });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { uuid },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};
