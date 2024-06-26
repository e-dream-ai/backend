import { RoleType } from "./role.types";

export type GetUsersQuery = {
  take: number;
  skip: number;
  role: RoleType;
  search?: string;
};

export type UpdateUserRequest = {
  name: string;
  description?: string;
  role?: number;
  enableMarketingEmails?: boolean;
};

export type UpdateUserRoleRequest = {
  role: RoleType;
};
