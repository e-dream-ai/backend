import { IsNull } from "typeorm";
import { editorProjectRepository } from "database/repositories";
import { EDITOR_PROJECT_NAME_MAX_LENGTH } from "constants/editor-project.constants";
import { APP_LOGGER } from "shared/logger";

export const removeEditorProjectsForPlaylist = async (playlistId: number) => {
  try {
    const result = await editorProjectRepository.softDelete({
      playlistId,
      deleted_at: IsNull(),
    });
    return result.affected ?? 0;
  } catch (error) {
    APP_LOGGER.error(error);
    return 0;
  }
};

export const renameEditorProjectsForPlaylist = async (
  playlistId: number,
  name: string,
) => {
  try {
    const result = await editorProjectRepository.update(
      { playlistId, deleted_at: IsNull() },
      {
        name: name.slice(0, EDITOR_PROJECT_NAME_MAX_LENGTH),
        updated_at: () => `"updated_at"`,
      },
    );
    return result.affected ?? 0;
  } catch (error) {
    APP_LOGGER.error(error);
    return 0;
  }
};
