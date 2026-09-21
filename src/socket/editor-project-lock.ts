import { Socket } from "socket.io";
import { User } from "entities";
import { editorProjectRepository } from "database/repositories";
import {
  EDITOR_PROJECT_SESSION_ID_MAX_LENGTH,
  JOIN_EDITOR_PROJECT_EVENT,
  LEAVE_EDITOR_PROJECT_EVENT,
} from "constants/editor-project.constants";
import { APP_LOGGER } from "shared/logger";
import {
  cancelEditorProjectLockRelease,
  editorProjectRoom,
  scheduleEditorProjectLockRelease,
} from "services/editor-project-lock.service";

type JoinPayload = { uuid?: string; sessionId?: string };

const isValidPayload = (payload: JoinPayload | undefined) =>
  Boolean(payload?.uuid) &&
  typeof payload?.sessionId === "string" &&
  payload.sessionId.length > 0 &&
  payload.sessionId.length <= EDITOR_PROJECT_SESSION_ID_MAX_LENGTH;

export const editorProjectLockConnectionListener = (socket: Socket) => {
  const user: User | undefined = socket.data?.user;
  if (!user) return;

  const joined = new Map<string, { projectId: number; sessionId: string }>();

  socket.on(JOIN_EDITOR_PROJECT_EVENT, async (payload: JoinPayload) => {
    if (!isValidPayload(payload)) return;

    const uuid = payload.uuid!;
    const sessionId = payload.sessionId!;

    try {
      const project = await editorProjectRepository.findOne({
        where: { uuid, userId: user.id },
        select: { id: true },
      });

      if (!project) return;

      await socket.join(editorProjectRoom(uuid));
      joined.set(uuid, { projectId: project.id, sessionId });
      cancelEditorProjectLockRelease(project.id, sessionId);
    } catch (error) {
      APP_LOGGER.error(`[EditorProjectLock] Failed to join ${uuid}`, error);
    }
  });

  socket.on(LEAVE_EDITOR_PROJECT_EVENT, async (payload: JoinPayload) => {
    const uuid = payload?.uuid;
    if (!uuid) return;

    const entry = joined.get(uuid);
    joined.delete(uuid);
    await socket.leave(editorProjectRoom(uuid));

    if (entry) {
      scheduleEditorProjectLockRelease({ ...entry, uuid });
    }
  });

  socket.on("disconnect", () => {
    joined.forEach((entry, uuid) => {
      scheduleEditorProjectLockRelease({ ...entry, uuid });
    });
    joined.clear();
  });
};
