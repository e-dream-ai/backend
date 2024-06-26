import { ROLES } from "constants/role.constants";
import { User } from "entities";
import { Role } from "entities/Role.entity";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";

export const getRoleSelectedColumns = (): FindOptionsSelect<Role> => {
  return {
    id: true,
    name: true,
    created_at: true,
    updated_at: true,
  };
};

export const getUserSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<User> => {
  return {
    id: true,
    cognitoId: true,
    name: true,
    description: true,
    avatar: true,
    nsfw: true,
    enableMarketingEmails: true,
    last_login_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    email: userEmail,
  };
};

export const getUserFindOptionsRelations = (): FindOptionsRelations<User> => {
  return {
    role: true,
    currentDream: true,
    currentPlaylist: true,
    signupInvite: true,
  };
};

/**
 * Checks if the given user is an admin.
 * @param user The user object to check.
 * @returns True if the user is an admin, false otherwise.
 */
export const isAdmin = (user?: User): boolean =>
  user?.role?.name === ROLES.ADMIN_GROUP;
