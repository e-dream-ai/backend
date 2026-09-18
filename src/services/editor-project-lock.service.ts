import { IsNull, LessThan } from "typeorm";
import { editorProjectRepository } from "database/repositories";
import {
  EDITOR_PROJECT_LOCK_EVENT,
  EDITOR_PROJECT_LOCK_GRACE_MS,
  EDITOR_PROJECT_LOCK_TTL_MS,
} from "constants/editor-project.constants";
import { APP_LOGGER } from "shared/logger";
import { getIo } from "socket/io";

export type EditorProjectLockState = {
  uuid: string;
  lockedBy: string | null;
  lockedAt: Date | null;
};

export const editorProjectRoom = (uuid: string) => `EDITOR_PROJECT:${uuid}`;

export const broadcastEditorProjectLock = (state: EditorProjectLockState) => {
  getIo()
    ?.of("/remote-control")
    .to(editorProjectRoom(state.uuid))
    .emit(EDITOR_PROJECT_LOCK_EVENT, state);
};

export const claimEditorProjectLock = async ({
  projectId,
  sessionId,
  force,
}: {
  projectId: number;
  sessionId: string;
  force?: boolean;
}) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - EDITOR_PROJECT_LOCK_TTL_MS);

  const freeOrStale = [
    { id: projectId, lockedBy: IsNull() },
    { id: projectId, lockedBy: sessionId },
    { id: projectId, lockedAt: LessThan(staleBefore) },
  ];

  const result = await editorProjectRepository.update(
    force ? { id: projectId } : freeOrStale,
    { lockedBy: sessionId, lockedAt: now, updated_at: () => `"updated_at"` },
  );

  return { claimed: Boolean(result.affected), lockedAt: now };
};

export const releaseEditorProjectLock = async ({
  projectId,
  sessionId,
  notRefreshedSince,
}: {
  projectId: number;
  sessionId: string;
  notRefreshedSince?: Date;
}) => {
  const result = await editorProjectRepository.update(
    {
      id: projectId,
      lockedBy: sessionId,
      ...(notRefreshedSince ? { lockedAt: LessThan(notRefreshedSince) } : {}),
    },
    { lockedBy: null, lockedAt: null, updated_at: () => `"updated_at"` },
  );

  return Boolean(result.affected);
};

const pendingReleases = new Map<string, NodeJS.Timeout>();

const releaseKey = (projectId: number, sessionId: string) =>
  `${projectId}:${sessionId}`;

export const cancelEditorProjectLockRelease = (
  projectId: number,
  sessionId: string,
) => {
  const key = releaseKey(projectId, sessionId);
  const timer = pendingReleases.get(key);
  if (!timer) return;

  clearTimeout(timer);
  pendingReleases.delete(key);
};

export const scheduleEditorProjectLockRelease = ({
  projectId,
  uuid,
  sessionId,
}: {
  projectId: number;
  uuid: string;
  sessionId: string;
}) => {
  cancelEditorProjectLockRelease(projectId, sessionId);

  const graceStartedAt = new Date();

  const timer = setTimeout(async () => {
    pendingReleases.delete(releaseKey(projectId, sessionId));

    try {
      const released = await releaseEditorProjectLock({
        projectId,
        sessionId,
        notRefreshedSince: graceStartedAt,
      });
      if (released) {
        broadcastEditorProjectLock({ uuid, lockedBy: null, lockedAt: null });
      }
    } catch (error) {
      APP_LOGGER.error(
        `[EditorProjectLock] Failed to release ${uuid} for ${sessionId}`,
        error,
      );
    }
  }, EDITOR_PROJECT_LOCK_GRACE_MS);

  timer.unref?.();
  pendingReleases.set(releaseKey(projectId, sessionId), timer);
};
