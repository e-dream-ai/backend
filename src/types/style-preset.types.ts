export type GetStylePresetsQuery = {
  model?: string;
};

export type StylePresetResponse = {
  uuid: string;
  name: string;
  section: string;
  stylePrompt: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
};
