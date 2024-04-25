export enum PlaylistItemType {
  NONE = "none",
  PLAYLIST = "playlist",
  DREAM = "dream",
}

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
  id: number;
};
