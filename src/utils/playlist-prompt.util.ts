import { PromptJson } from "./prompt.util";

export interface UprezPlaylistPromptJson extends PromptJson {
  infinidream_algorithm: "uprez_playlist";
  source_playlist_uuid: string;
  dream_algorithm?: string;
  params?: Record<string, unknown>;
}

export const isUprezPlaylistPrompt = (
  prompt: PromptJson | null,
): prompt is UprezPlaylistPromptJson => {
  return (
    !!prompt &&
    prompt.infinidream_algorithm === "uprez_playlist" &&
    typeof prompt.source_playlist_uuid === "string"
  );
};
