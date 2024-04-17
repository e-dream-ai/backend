import { ROLES } from "constants/role.constants";
import { User } from "entities";
import { Role } from "entities/Role.entity";
import { FindOptionsSelect } from "typeorm";

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
    created_at: true,
    updated_at: true,
    deleted_at: true,
    email: userEmail,
  };
};

/**
 * Checks if the given user is an admin.
 * @param user The user object to check.
 * @returns True if the user is an admin, false otherwise.
 */
export const isAdmin = (user?: User): boolean =>
  user?.role?.name === ROLES.ADMIN_GROUP;
