export enum RecentItemType {
  PROMPT = "prompt",
  STYLE = "style",
}

export type RecentItemParamsRequest = {
  type: RecentItemType;
  dreamUuid: string;
};

export type GetRecentItemsQuery = {
  type: RecentItemType;
  take?: number;
};

export type RecentItemResponse = {
  dreamUuid: string;
  lastUsedAt: Date;
};
