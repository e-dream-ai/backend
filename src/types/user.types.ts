import { RoleType } from "./role.types";
import { VoteType } from "./vote.types";

export type UserParamsRequest = {
  uuid: string;
};

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
  nsfw?: boolean;
  enableMarketingEmails?: boolean;
  quota?: number;
};

export type UpdateUserRoleRequest = {
  role: RoleType;
};

export type GetVotedDreamsRequest = {
  take?: number;
  skip?: number;
  type?: VoteType;
};
