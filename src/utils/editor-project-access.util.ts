import { Playlist, User } from "entities";
import { ROLES } from "constants/role.constants";
import { isAdmin } from "utils/user.util";

type PlaylistVisibility = Pick<Playlist, "hidden" | "nsfw">;

export const canOpenOthersEditorProjects = (viewer: User): boolean =>
  isAdmin(viewer) || viewer.role?.name === ROLES.CREATOR_GROUP;

export const canOpenEditorProject = (
  viewer: User,
  ownerId: number | null,
  playlist?: PlaylistVisibility | null,
): boolean => {
  if (ownerId !== null && ownerId === viewer.id) return true;
  if (!canOpenOthersEditorProjects(viewer)) return false;
  if (isAdmin(viewer) || !playlist) return true;

  return !playlist.hidden && (!playlist.nsfw || Boolean(viewer.nsfw));
};
