export const GAEventKeys = {
  // Users
  USER_NEW_SIGNUP: {
    category: "user",
    action: "signed_up",
  },
  USER_NEW_UPLOAD: {
    category: "user",
    action: "uploaded_dream",
  },

  // Dreams
  DREAM_UPLOADED: {
    category: "dream",
    action: "uploaded",
  },
  DREAM_PLAYED: {
    category: "dream",
    action: "played",
  },

  // Playlists
  PLAYLIST_CREATED: {
    category: "playlist",
    action: "created",
  },
  PLAYLIST_ITEM_ADDED: {
    category: "playlist",
    action: "add_item",
  },
  PLAYLIST_PLAYED: {
    category: "playlist",
    action: "played",
  },
  REMOTE_CONTROL: {
    category: "remote_control",
    action: "emitted",
  },
  CLIENT_HELLO: {
    category: "client",
    action: "hello",
  },
  CLIENT_PING: {
    category: "client",
    action: "ping",
  },
};
