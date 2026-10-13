export enum EditorId {
  FLOW = "flow",
  ACTION = "action",
  ENHANCE = "enhance",
  DEFORUM = "deforum",
}

export type EditorProjectState = Record<string, unknown>;

export type EditorProjectParamsRequest = {
  uuid: string;
};

export type GetEditorProjectsQuery = {
  editorId?: EditorId;
  playlistUuid?: string;
  dreamUuid?: string;
  search?: string;
  archived?: "true" | "false";
  take?: number;
  skip?: number;
};

export type CreateEditorProjectRequest = {
  editorId: EditorId;
  name: string;
  state: EditorProjectState;
  schemaVersion?: number;
  thumbnailDreamUuid?: string | null;
  playlistUuid?: string | null;
};

export type UpdateEditorProjectRequest = {
  revision: number;
  name?: string;
  state?: EditorProjectState;
  schemaVersion?: number;
  thumbnailDreamUuid?: string | null;
  playlistUuid?: string | null;
  sessionId?: string;
};

export type EditorProjectLockRequest = {
  sessionId: string;
  force?: boolean;
};

export type EditorProjectLockQuery = {
  sessionId: string;
};
