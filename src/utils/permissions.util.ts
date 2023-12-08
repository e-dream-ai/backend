import { RoleType } from "types/role.types";

type CanExecuteAction = (params: {
  isOwner: boolean;
  allowedRoles: Array<RoleType>;
  userRole?: RoleType;
}) => boolean;

export const canExecuteAction: CanExecuteAction = ({
  isOwner,
  allowedRoles,
  userRole,
}) => {
  if (isOwner) return true;
  if (!userRole) return false;
  return allowedRoles.indexOf(userRole) > -1;
};
