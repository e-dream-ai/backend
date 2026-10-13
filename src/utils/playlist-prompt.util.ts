import { PromptJson } from "./prompt.util";

export interface EnhancePlaylistPromptJson extends PromptJson {
  infinidream_algorithm: "enhance_playlist";
  source_playlist_uuid: string;
  dream_algorithm?: string;
  params?: Record<string, unknown>;
}

export const isEnhancePlaylistPrompt = (
  prompt: PromptJson | null,
): prompt is EnhancePlaylistPromptJson => {
  return (
    !!prompt &&
    prompt.infinidream_algorithm === "enhance_playlist" &&
    typeof prompt.source_playlist_uuid === "string"
  );
};
