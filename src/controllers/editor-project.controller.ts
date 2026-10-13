import httpStatus from "http-status";
import { FindOptionsWhere, ILike, In, IsNull, LessThan, Not } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { EditorProject, User } from "entities";
import { PAGINATION } from "constants/pagination.constants";
import {
  EDITOR_PROJECT_LOCK_TTL_MS,
  EDITOR_PROJECT_MESSAGES,
} from "constants/editor-project.constants";
import {
  broadcastEditorProjectLock,
  cancelEditorProjectLockRelease,
  claimEditorProjectLock,
  releaseEditorProjectLock,
} from "services/editor-project-lock.service";
import { RequestType, ResponseType } from "types/express.types";
import {
  CreateEditorProjectRequest,
  EditorProjectLockQuery,
  EditorProjectLockRequest,
  EditorProjectParamsRequest,
  EditorProjectState,
  GetEditorProjectsQuery,
  UpdateEditorProjectRequest,
} from "types/editor-project.types";
import {
  dreamRepository,
  editorProjectRepository,
  playlistItemRepository,
  playlistRepository,
} from "database/repositories";
import {
  getEditorProjectRelations,
  getEditorProjectSelectedColumns,
  getEditorProjectSummaryColumns,
  toEditorProjectResponse,
  toEditorProjectResponses,
} from "utils/editor-project.util";
import { canOpenEditorProject } from "utils/editor-project-access.util";
import { fillEditorProjectPlaylistThumbnails } from "services/editor-project-playlist.service";
import { isAdmin } from "utils/user.util";
import {
  handleConflict,
  handleInternalServerError,
  handleNotFound,
  jsonResponse,
} from "utils/responses.util";
import { escapeLikePattern } from "utils/like-pattern.util";

const isLockHeldByAnotherSession = (
  project: Pick<EditorProject, "lockedBy" | "lockedAt">,
  sessionId?: string,
) => {
  if (!project.lockedBy || project.lockedBy === sessionId) return false;
  if (!project.lockedAt) return false;

  return project.lockedAt.getTime() > Date.now() - EDITOR_PROJECT_LOCK_TTL_MS;
};

const handleLocked = (res: ResponseType, lockedAt: Date | null) =>
  res.status(httpStatus.LOCKED).json(
    jsonResponse({
      success: false,
      message: EDITOR_PROJECT_MESSAGES.LOCK_HELD,
      data: { lock: { lockedAt } },
    }),
  );

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

type ProjectScope = FindOptionsWhere<EditorProject>;

const resolvePlaylistScope = async (
  playlistUuid: string,
  viewer: User,
): Promise<ProjectScope | null> => {
  const playlist = await playlistRepository.findOne({
    where: { uuid: playlistUuid },
    select: { id: true, userId: true, hidden: true, nsfw: true },
  });

  if (!playlist?.userId) return null;
  if (!canOpenEditorProject(viewer, playlist.userId, playlist)) return null;

  return { playlistId: playlist.id, userId: playlist.userId };
};

const resolveDreamScope = async (
  dreamUuid: string,
  viewer: User,
): Promise<ProjectScope | null> => {
  const dream = await dreamRepository.findOne({
    where: { uuid: dreamUuid },
    select: { id: true, userId: true },
  });

  if (!dream?.userId) return null;
  const ownerId = dream.userId;

  const items = await playlistItemRepository.find({
    where: { dreamItem: { id: dream.id }, playlist: { userId: ownerId } },
    relations: { playlist: true },
    select: { id: true, playlist: { id: true, hidden: true, nsfw: true } },
  });

  const playlistIds = [
    ...new Set(
      items
        .filter(({ playlist }) =>
          canOpenEditorProject(viewer, ownerId, playlist),
        )
        .map(({ playlist }) => playlist.id),
    ),
  ];

  return playlistIds.length > 0
    ? { playlistId: In(playlistIds), userId: ownerId }
    : null;
};

const resolveProjectScope = (
  viewer: User,
  { playlistUuid, dreamUuid }: GetEditorProjectsQuery,
): Promise<ProjectScope | null> => {
  if (playlistUuid) return resolvePlaylistScope(playlistUuid, viewer);
  if (dreamUuid) return resolveDreamScope(dreamUuid, viewer);
  return Promise.resolve({ userId: viewer.id });
};

export const handleGetEditorProjects = async (
  req: RequestType<unknown, GetEditorProjectsQuery>,
  res: ResponseType,
) => {
  const user = res.locals.user!;
  const { editorId, search, archived } = req.query;
  const take = Number(req.query.take ?? PAGINATION.TAKE);
  const skip = Number(req.query.skip ?? PAGINATION.SKIP);

  try {
    const scope = await resolveProjectScope(user, req.query);

    if (!scope) {
      return res.status(httpStatus.OK).json(
        jsonResponse({
          success: true,
          data: { projects: [], count: 0 },
        }),
      );
    }

    const [projects, count] = await editorProjectRepository.findAndCount({
      where: {
        ...scope,
        ...(editorId ? { editorId } : {}),
        ...(search ? { name: ILike(`%${escapeLikePattern(search)}%`) } : {}),
        ...(archived
          ? { archivedAt: archived === "true" ? Not(IsNull()) : IsNull() }
          : {}),
      },
      select: getEditorProjectSummaryColumns(),
      relations: getEditorProjectRelations(),
      order: { updated_at: "DESC" },
      take,
      skip,
    });

    await fillEditorProjectPlaylistThumbnails(projects, {
      userId: user.id,
      isAdmin: isAdmin(user),
      nsfw: user.nsfw,
    });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          projects: toEditorProjectResponses(projects, user),
          count,
        },
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
      where: { uuid },
      select: getEditorProjectSelectedColumns(),
      relations: getEditorProjectRelations(),
    });

    if (
      !project ||
      !canOpenEditorProject(user, project.userId, project.playlist)
    ) {
      return handleNotFound(req as RequestType, res);
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { project: toEditorProjectResponse(project, user) },
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
        data: {
          project: created ? toEditorProjectResponse(created, user) : saved,
        },
      }),
    );
  } catch (error) {
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
        data: { project: toEditorProjectResponse(project, user) },
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

    const staleBefore = new Date(Date.now() - EDITOR_PROJECT_LOCK_TTL_MS);
    const base = { id: project.id, revision: body.revision };
    const writable = [
      { ...base, lockedBy: IsNull() },
      ...(body.sessionId ? [{ ...base, lockedBy: body.sessionId }] : []),
      { ...base, lockedAt: LessThan(staleBefore) },
    ];

    const result = await editorProjectRepository.update(writable, updates);

    if (!result.affected) {
      const lock = await editorProjectRepository.findOne({
        where: { id: project.id },
        select: { lockedBy: true, lockedAt: true },
      });

      if (lock && isLockHeldByAnotherSession(lock, body.sessionId)) {
        return handleLocked(res, lock.lockedAt);
      }

      const current = await editorProjectRepository.findOne({
        where: { uuid, userId: user.id },
        select: getEditorProjectSelectedColumns(),
        relations: getEditorProjectRelations(),
      });

      return handleConflict(req as RequestType, res, {
        message: EDITOR_PROJECT_MESSAGES.REVISION_CONFLICT,
        ...(current
          ? { data: { project: toEditorProjectResponse(current, user) } }
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
        data: {
          project: updated ? toEditorProjectResponse(updated, user) : null,
        },
      }),
    );
  } catch (error) {
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

const setEditorProjectArchived = async (
  req: RequestType<unknown, unknown, EditorProjectParamsRequest>,
  res: ResponseType,
  archived: boolean,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: { id: true, archivedAt: true },
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    const archivedAt = archived ? project.archivedAt ?? new Date() : null;

    if (Boolean(project.archivedAt) !== archived) {
      await editorProjectRepository.update(
        { id: project.id },
        { archivedAt, updated_at: () => `"updated_at"` },
      );
    }

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: { uuid, archivedAt },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleArchiveEditorProject = (
  req: RequestType<unknown, unknown, EditorProjectParamsRequest>,
  res: ResponseType,
) => setEditorProjectArchived(req, res, true);

export const handleUnarchiveEditorProject = (
  req: RequestType<unknown, unknown, EditorProjectParamsRequest>,
  res: ResponseType,
) => setEditorProjectArchived(req, res, false);

export const handleLockEditorProject = async (
  req: RequestType<
    EditorProjectLockRequest,
    unknown,
    EditorProjectParamsRequest
  >,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const { sessionId, force } = req.body as EditorProjectLockRequest;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: { id: true },
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    const { claimed, lockedAt } = await claimEditorProjectLock({
      projectId: project.id,
      sessionId,
      force,
    });

    if (!claimed) {
      const current = await editorProjectRepository.findOne({
        where: { id: project.id },
        select: { lockedAt: true },
      });

      return handleLocked(res, current?.lockedAt ?? null);
    }

    cancelEditorProjectLockRelease(project.id, sessionId);
    broadcastEditorProjectLock({ uuid, lockedBy: sessionId, lockedAt });

    return res.status(httpStatus.OK).json(
      jsonResponse({
        success: true,
        data: {
          lock: { lockedAt, expiresInMs: EDITOR_PROJECT_LOCK_TTL_MS },
        },
      }),
    );
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};

export const handleUnlockEditorProject = async (
  req: RequestType<unknown, EditorProjectLockQuery, EditorProjectParamsRequest>,
  res: ResponseType,
) => {
  const uuid: string = req.params.uuid!;
  const user = res.locals.user!;
  const sessionId: string = req.query.sessionId!;

  try {
    const project = await editorProjectRepository.findOne({
      where: { uuid, userId: user.id },
      select: { id: true },
    });

    if (!project) {
      return handleNotFound(req as RequestType, res);
    }

    cancelEditorProjectLockRelease(project.id, sessionId);

    const released = await releaseEditorProjectLock({
      projectId: project.id,
      sessionId,
    });

    if (released) {
      broadcastEditorProjectLock({ uuid, lockedBy: null, lockedAt: null });
    }

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return handleInternalServerError(error as Error, req as RequestType, res);
  }
};
