import { Dream } from "entities";
import { APP_LOGGER } from "shared/logger";

export interface PromptJson {
  infinidream_algorithm: string;
  [key: string]: unknown;
}

const SUPPORTED_ALGORITHMS = [
  "animatediff",
  "deforum",
  "uprez",
  "qwen-image",
] as const;
type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

const ALGORITHM_TO_QUEUE_MAP: Record<SupportedAlgorithm, string> = {
  animatediff: "video",
  deforum: "deforumvideo",
  uprez: "uprezvideo",
  "qwen-image": "qwenimage",
};

export const parsePromptJson = (dream: Dream): PromptJson | null => {
  if (!dream.prompt) {
    return null;
  }

  try {
    const parsed =
      typeof dream.prompt === "string"
        ? JSON.parse(dream.prompt)
        : dream.prompt;

    if (!parsed.infinidream_algorithm) {
      APP_LOGGER.warn(
        `Dream ${dream.uuid} has prompt but missing infinidream_algorithm`,
      );
      return null;
    }

    return parsed as PromptJson;
  } catch (error) {
    APP_LOGGER.error(
      `Failed to parse prompt JSON for dream ${dream.uuid}:`,
      error,
    );
    return null;
  }
};

export const getAlgorithmFromPrompt = (
  promptJson: PromptJson,
): string | null => {
  return promptJson.infinidream_algorithm || null;
};

export const isValidAlgorithm = (
  algorithm: string,
): algorithm is SupportedAlgorithm => {
  return SUPPORTED_ALGORITHMS.includes(algorithm as SupportedAlgorithm);
};

export const mapAlgorithmToQueue = (algorithm: string): string | null => {
  if (!isValidAlgorithm(algorithm)) {
    return null;
  }
  return ALGORITHM_TO_QUEUE_MAP[algorithm];
};

export const isImageGenerationAlgorithm = (algorithm: string): boolean => {
  return algorithm === "qwen-image";
};
