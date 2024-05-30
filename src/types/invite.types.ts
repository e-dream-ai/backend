export type GetInvitesQuery = {
  take: number;
  skip: number;
};

export type CreateInviteRequest = {
  email?: string;
  size?: number;
};

export type InvalidateInviteQuery = {
  id: number;
};
