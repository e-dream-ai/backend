export const EDITOR_PROJECT_API_PATH = "/api/v2/editor-projects";

export const EDITOR_PROJECT_BODY_LIMIT = "512kb";

export const EDITOR_PROJECT_NAME_MAX_LENGTH = 120;

export const EDITOR_PROJECT_LOCK_TTL_MS = 90_000;

export const EDITOR_PROJECT_SESSION_ID_MAX_LENGTH = 64;

export const EDITOR_PROJECT_LOCK_GRACE_MS = 45_000;

export const EDITOR_PROJECT_LOCK_EVENT = "editor_project_lock";

export const JOIN_EDITOR_PROJECT_EVENT = "join_editor_project";

export const LEAVE_EDITOR_PROJECT_EVENT = "leave_editor_project";

export const EDITOR_PROJECT_MESSAGES = {
  REVISION_CONFLICT:
    "This project was changed elsewhere. Reload it or save a copy.",
  PLAYLIST_NOT_FOUND: "Playlist not found.",
  LOCK_HELD: "This project is already open somewhere else.",
  LOCK_LOST: "This project was taken over in another tab or on another device.",
};
