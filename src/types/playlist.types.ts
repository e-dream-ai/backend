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
  nsfw?: boolean;
};

export type UpdatePlaylistRequest = {
  name?: string;
  featureRank?: number;
  displayedOwner?: number;
  nsfw?: boolean;
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
