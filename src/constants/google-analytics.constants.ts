export const GAEventKeys = {
  // Users
  USER_NEW_SIGNUP: {
    category: "user",
    action: "signed_up",
    label: "user_id",
    value: "user_id",
  },
  USER_NEW_UPLOAD: {
    category: "user",
    action: "uploaded_dream",
    label: "user_id",
    value: "user_id",
  },

  // Dreams
  DREAM_CREATED: {
    category: "dream",
    action: "created",
    label: "dream_uuid",
    value: "dream_uuid",
  },
  DREAM_UPLOADED: {
    category: "dream",
    action: "uploaded",
    label: "duration_in_seconds",
    value: "duration_in_seconds",
  },
  DREAM_UPLOADED_SIZE: {
    category: "dream",
    action: "uploaded",
    label: "size_in_bytes",
    value: "size_in_bytes",
  },
  DREAM_PLAYED: {
    category: "dream",
    action: "played",
    label: "dream_uuid",
    value: "dream_uuid",
  },

  // Playlists
  PLAYLIST_CREATED: {
    category: "playlist",
    action: "created",
    label: "playlist_uuid",
    value: "playlist_uuid",
  },
  PLAYLIST_ITEM_ADDED: {
    category: "playlist",
    action: "add_item",
    label: "playlist_uuid",
    value: "playlist_uuid",
  },
  PLAYLIST_PLAYED: {
    category: "playlist",
    action: "played",
    label: "playlist_uuid",
    value: "playlist_uuid",
  },

  // Client
};
