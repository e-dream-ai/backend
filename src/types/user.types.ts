import { RoleType } from "./role.types";

export type UpdateUserRequest = {
  name: string;
  description?: string;
};

export type UpdateUserRoleRequest = {
  role: RoleType;
};
