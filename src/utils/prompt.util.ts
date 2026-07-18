import { APP_LOGGER } from "shared/logger";

export interface PromptJson {
  infinidream_algorithm: string;
  [key: string]: unknown;
}

export interface PromptCarrier {
  uuid: string;
  prompt?: string | null;
}

export const serializePrompt = (
  prompt?: Record<string, unknown> | string | null,
): string | null => {
  if (prompt === undefined || prompt === null) {
    return null;
  }
  return typeof prompt === "string" ? prompt : JSON.stringify(prompt);
};

const SUPPORTED_ALGORITHMS = [
  "animatediff",
  "deforum",
  "uprez",
  "qwen-image",
  "z-image-turbo",
  "flux-schnell",
  "wan-t2v",
  "wan-i2v",
  "wan-i2v-lora",
  "ltx-i2v",
  "kling-i2v",
  "kling-25-i2v",
  "nvidia-uprez",
  "discodiffusion",
] as const;
export type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

const ALGORITHM_TO_QUEUE_MAP: Record<SupportedAlgorithm, string> = {
  animatediff: "video",
  deforum: "deforumvideo",
  uprez: "uprezvideo",
  "qwen-image": "qwenimage",
  "z-image-turbo": "zimageturbo",
  "flux-schnell": "falimage",
  "wan-t2v": "want2v",
  "wan-i2v": "wani2v",
  "wan-i2v-lora": "wani2vlora",
  "ltx-i2v": "ltxi2v",
  "kling-i2v": "falvideo",
  "kling-25-i2v": "falvideo",
  "nvidia-uprez": "nvidiavsr",
  discodiffusion: "discodiffusion",
};

export const GENERATION_QUEUES: string[] = [
  ...new Set(Object.values(ALGORITHM_TO_QUEUE_MAP)),
];

export const parsePromptJson = (entity: PromptCarrier): PromptJson | null => {
  if (!entity.prompt) {
    return null;
  }

  try {
    const parsed =
      typeof entity.prompt === "string"
        ? JSON.parse(entity.prompt)
        : entity.prompt;

    if (!parsed.infinidream_algorithm) {
      APP_LOGGER.warn(
        `Entity ${entity.uuid} has prompt but missing infinidream_algorithm`,
      );
      return null;
    }

    return parsed as PromptJson;
  } catch (error) {
    APP_LOGGER.error(
      `Failed to parse prompt JSON for entity ${entity.uuid}:`,
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
  return (
    algorithm === "qwen-image" ||
    algorithm === "z-image-turbo" ||
    algorithm === "flux-schnell"
  );
};
