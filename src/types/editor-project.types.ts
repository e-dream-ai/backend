export enum EditorId {
  FLOW = "flow",
  ACTION = "action",
  UPREZ = "uprez",
}

export type EditorProjectState = Record<string, unknown>;

export type EditorProjectParamsRequest = {
  uuid: string;
};

export type GetEditorProjectsQuery = {
  editorId?: EditorId;
  playlistUuid?: string;
  search?: string;
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
};
