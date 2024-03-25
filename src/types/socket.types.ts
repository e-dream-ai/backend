export const REMOTE_CONTROLS = {
  PLAYING: "playing",
  PLAY_DREAM: "play_dream",
  PLAY_PLAYLIST: "play_playlist",
  DISLIKE_CURRENT_DREAM: "dislike",
  LIKE_CURRENT_DREAM: "like",
  GO_PREVIOUS_DREAM: "previous",
  GO_NEXT_DREAM: "next",
  PLAYBACK_SLOWER: "playback_slower",
  PLAYBACK_FASTER: "playback_faster",
  FORWARD: "forward",
  BACKWARD: "backward",
  BRIGHTER: "brighter",
  DARKER: "darker",
  CREDIT: "credit",
  WEB: "web",
  HELP: "help",
  STATUS: "status",
  SET_SPEED_1: "set_speed_1",
  SET_SPEED_2: "set_speed_2",
  SET_SPEED_3: "set_speed_3",
  SET_SPEED_4: "set_speed_4",
  SET_SPEED_5: "set_speed_5",
  SET_SPEED_6: "set_speed_6",
  SET_SPEED_7: "set_speed_7",
  SET_SPEED_8: "set_speed_8",
  SET_SPEED_9: "set_speed_9",
  PAUSE_1: "pause",
  PAUSE_2: "pause",
  CAPTURE: "capture",
  REPORT: "report",
  RESET_PLAYLIST: "reset_playlist",
};

export type RemoteControlEvent = {
  event: string;
  name?: string;
  uuid?: string;
  id?: number;
  key?: string;
};
