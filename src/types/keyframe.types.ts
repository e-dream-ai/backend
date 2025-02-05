export type GetKeyframeQuery = {
  take?: number;
  skip?: number;
  search?: string;
  userUUID?: string;
};

export type KeyframeParamsRequest = {
  uuid: string;
};

export type CreateKeyframeRequest = {
  name: string;
};

export type UpdateKeyframeRequest = {
  name?: string;
};
