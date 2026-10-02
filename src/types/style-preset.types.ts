export type GetStylePresetsQuery = {
  model?: string;
};

export type StylePresetResponse = {
  uuid: string;
  name: string;
  section: string;
  stylePrompt: string;
  thumbnail: string;
  width?: number;
  height?: number;
};
