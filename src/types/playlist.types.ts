export enum PlaylistItemType {
  NONE = "none",
  PLAYLIST = "playlist",
  DREAM = "dream",
}

export type GetPlaylistQuery = {
  take?: number;
  skip?: number;
  search?: string;
  userUUID?: string;
};

export type PlaylistParamsRequest = {
  uuid: string;
};

export type CreatePlaylistRequest = {
  name: string;
  description?: string;
  nsfw?: boolean;
  hidden?: boolean;
  loops?: number;
};

export type UpdatePlaylistRequest = {
  name?: string;
  description?: string;
  featureRank?: number;
  displayedOwner?: number;
  nsfw?: boolean;
  hidden?: boolean;
  loops?: number;
  user?: string;
};

export type OrderPlaylist = {
  id: number;
  order: number;
};

export type OrderPlaylistRequest = {
  order: OrderPlaylist[];
};

export type AddPlaylistItemRequest = {
  type: PlaylistItemType;
  uuid: string;
};

export type RemovePlaylistItemRequest = {
  uuid: string;
  itemId: number;
};

export type AddPlaylistKeyframeRequest = {
  uuid: string;
};

export type RemovePlaylistKeyframeRequest = {
  uuid: string;
  playlistKeyframeId: number;
};

export type GetPlaylistItemsQuery = {
  take?: number;
  skip?: number;
};

export type GetPlaylistKeyframesQuery = {
  take?: number;
  skip?: number;
};
