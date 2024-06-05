export type GetInvitesQuery = {
  take: number;
  skip: number;
};

export type CreateInviteRequest = {
  email?: string;
  code?: string;
  size?: number;
  codeLength?: number;
  roleId: number;
};

export type InvalidateInviteQuery = {
  id: number;
};
