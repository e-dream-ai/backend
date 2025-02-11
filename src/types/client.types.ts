import { DreamStatusType } from "./dream.types";

export type GetDreamsQuery = {
  uuids: string;
};

export type GetDreamsRequestQuery = {
  uuids: string[];
};

export type PartialClientDream = {
  uuid: string;
  timestamp?: number;
};

export type ClientDream = {
  uuid: string;
  name?: string | null;
  artist?: string | null;
  size?: number | null;
  status: DreamStatusType;
  fps?: number | null;
  frames?: number | null;
  thumbnail?: string | null;
  upvotes: number;
  downvotes: number;
  nsfw: boolean;
  frontendUrl: string;
  activityLevel?: number | null;
  md5?: string | null;
  timestamp: number;
  video_timestamp?: number | null;
};

export type ClientPlaylist = {
  id: number;
  name?: string | null;
  artist?: string | null;
  thumbnail?: string | null;
  nsfw: boolean;
  contents: {
    uuid: string;
    timestamp: number;
  }[];
  timestamp: number;
};
