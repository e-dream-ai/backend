import { FeedItemType } from "./feed-item.types";
import { Dream, User, FeedItem } from "entities";
import { DreamMediaType } from "./dream.types";

export type GetFeedRequest = {
  take?: number;
  skip?: number;
  search?: string;
  userUUID?: string;
  type?: FeedItemType;
  onlyHidden?: string;
  mediaType?: DreamMediaType;
  orphans?: FeedOrphansFilter;
};

/**
 * Orphans are dreams that are not in any playlist.
 * "hide" leaves them out of the feed, "only" shows nothing else.
 */
export type FeedOrphansFilter = "hide" | "only";

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
