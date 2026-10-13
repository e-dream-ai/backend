import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { EditorProject, User } from "entities";
import { signKey } from "utils/transform.util";

export const getEditorProjectRelations =
  (): FindOptionsRelations<EditorProject> => ({
    playlist: true,
    thumbnailDream: true,
    user: true,
  });

export const getEditorProjectSummaryColumns =
  (): FindOptionsSelect<EditorProject> => ({
    id: true,
    uuid: true,
    editorId: true,
    name: true,
    revision: true,
    schemaVersion: true,
    playlist: {
      id: true,
      uuid: true,
      name: true,
      thumbnail: true,
      nsfw: true,
      hidden: true,
    },
    thumbnailDream: { uuid: true, thumbnail: true, nsfw: true },
    user: { id: true, uuid: true, name: true, avatar: true },
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

export type EditorProjectOwner = {
  uuid: string;
  name: string | null;
  avatar: string | null;
};

export type EditorProjectResponse = Omit<
  EditorProject,
  "thumbnailDream" | "playlist" | "user"
> & {
  thumbnail: string | null;
  playlist?: { uuid: string; name: string | null } | null;
  owner: EditorProjectOwner | null;
  canEdit: boolean;
};

const toEditorProjectOwner = (
  user: User | null | undefined,
): EditorProjectOwner | null => {
  if (!user) return null;

  return {
    uuid: user.uuid,
    name: user.name ?? null,
    avatar: user.avatar ? signKey(user.avatar) : null,
  };
};

export const toEditorProjectResponse = (
  project: EditorProject,
  viewer: User,
): EditorProjectResponse => {
  const { thumbnailDream, playlist, user, ...rest } = project;
  const hideThumbnail =
    !viewer.nsfw && Boolean(thumbnailDream?.nsfw || playlist?.nsfw);
  const key = hideThumbnail
    ? null
    : thumbnailDream?.thumbnail ?? playlist?.thumbnail ?? null;

  return {
    ...rest,
    thumbnail: key ? signKey(key) : null,
    playlist: playlist
      ? { uuid: playlist.uuid, name: playlist.name ?? null }
      : null,
    owner: toEditorProjectOwner(user),
    canEdit: user?.id === viewer.id,
  };
};

export const toEditorProjectResponses = (
  projects: EditorProject[],
  viewer: User,
): EditorProjectResponse[] =>
  projects.map((project) => toEditorProjectResponse(project, viewer));
