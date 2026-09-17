import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { EditorProject } from "entities";
import { signKey } from "utils/transform.util";

export const getEditorProjectRelations =
  (): FindOptionsRelations<EditorProject> => ({
    playlist: true,
    thumbnailDream: true,
  });

export const getEditorProjectSummaryColumns =
  (): FindOptionsSelect<EditorProject> => ({
    id: true,
    uuid: true,
    editorId: true,
    name: true,
    revision: true,
    schemaVersion: true,
    playlist: { uuid: true, name: true, thumbnail: true },
    thumbnailDream: { uuid: true, thumbnail: true },
    created_at: true,
    updated_at: true,
  });

export const getEditorProjectSelectedColumns =
  (): FindOptionsSelect<EditorProject> => ({
    ...getEditorProjectSummaryColumns(),
    userId: true,
    playlistId: true,
    state: true,
  });

export type EditorProjectResponse = Omit<
  EditorProject,
  "thumbnailDream" | "playlist"
> & {
  thumbnail: string | null;
  playlist?: { uuid: string; name: string | null } | null;
};

export const toEditorProjectResponse = (
  project: EditorProject,
): EditorProjectResponse => {
  const { thumbnailDream, playlist, ...rest } = project;
  const key = thumbnailDream?.thumbnail ?? playlist?.thumbnail ?? null;

  return {
    ...rest,
    thumbnail: key ? signKey(key) : null,
    playlist: playlist
      ? { uuid: playlist.uuid, name: playlist.name ?? null }
      : null,
  };
};

export const toEditorProjectResponses = (
  projects: EditorProject[],
): EditorProjectResponse[] => projects.map(toEditorProjectResponse);
