import { RoleType } from "./role.types";

export type UpdateUserRequest = {
  name: string;
  description?: string;
  role?: number;
};

export type UpdateUserRoleRequest = {
  role: RoleType;
};
