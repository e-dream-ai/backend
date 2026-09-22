import { IsNull } from "typeorm";
import { EditorProject, Playlist } from "entities";
import { editorProjectRepository } from "database/repositories";
import { computePlaylistThumbnailsBatch } from "utils/playlist.util";
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

type ProjectWithPlaylist = EditorProject & { playlist: Playlist };

export const fillEditorProjectPlaylistThumbnails = async (
  projects: EditorProject[],
  viewer: { userId: number; isAdmin: boolean; nsfw?: boolean },
) => {
  const pending = projects.filter(
    (project): project is ProjectWithPlaylist =>
      !project.thumbnailDream?.thumbnail &&
      Boolean(project.playlist) &&
      !project.playlist?.thumbnail &&
      (viewer.nsfw || !project.playlist?.nsfw),
  );

  if (pending.length === 0) return;

  try {
    const resolved = await computePlaylistThumbnailsBatch(
      pending.map(({ playlist }) => playlist),
      {
        userId: viewer.userId,
        isAdmin: viewer.isAdmin,
        nsfw: viewer.nsfw,
        onlyProcessedDreams: true,
      },
    );

    for (const { playlist } of pending) {
      const thumbnail = resolved.get(playlist.id);
      if (thumbnail) playlist.thumbnail = thumbnail;
    }
  } catch (error) {
    APP_LOGGER.error(error);
  }
};
