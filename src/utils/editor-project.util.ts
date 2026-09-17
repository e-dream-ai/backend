import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { EditorProject } from "entities";

export const getEditorProjectRelations =
  (): FindOptionsRelations<EditorProject> => ({
    playlist: true,
  });

export const getEditorProjectSummaryColumns =
  (): FindOptionsSelect<EditorProject> => ({
    id: true,
    uuid: true,
    editorId: true,
    name: true,
    revision: true,
    schemaVersion: true,
    thumbnail: true,
    playlist: { uuid: true, name: true },
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
