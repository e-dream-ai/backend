export enum PlaylistItemType {
  NONE = "none",
  PLAYLIST = "playlist",
  DREAM = "dream",
}

export type CreatePlaylistRequest = {
  name?: string;
  thumbnail?: string;
};

export type UpdatePlaylistRequest = Array<{
  id: number;
  order: number;
}>;

export type AddPlaylistItemRequest = {
  type: PlaylistItemType;
  id: number;
};
