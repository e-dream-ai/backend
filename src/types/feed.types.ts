import { FeedItemType } from "./feed-item.types";

export type GetFeedRequest = {
  take?: number;
  skip?: number;
  search?: string;
  userId?: number;
  type?: FeedItemType;
};
