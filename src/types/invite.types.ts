export type GetInvitesQuery = {
  take: number;
  skip: number;
};

export type CreateInviteRequest = {
  emails?: string[];
  code?: string;
  size?: number;
  codeLength?: number;
};

export type InvalidateInviteQuery = {
  id: number;
};
