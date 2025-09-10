import { FeedItemType } from "./feed-item.types";
import { Dream, User, FeedItem } from "entities";

export type GetFeedRequest = {
  take?: number;
  skip?: number;
  search?: string;
  userUUID?: string;
  type?: FeedItemType;
  onlyHidden?: string;
};

export type VirtualPlaylist = {
  id: number;
  uuid: string;
  name: string;
  user?: User;
  displayedOwner?: User;
  dreams: Dream[];
  created_at: Date | string;
};

export type GroupedFeedResponse = {
  feedItems: FeedItem[];
  virtualPlaylists: VirtualPlaylist[];
  count: number;
};
