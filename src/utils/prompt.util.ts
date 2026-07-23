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
  "flux-kontext-i2i",
] as const;
export type SupportedAlgorithm = (typeof SUPPORTED_ALGORITHMS)[number];

type AlgorithmMedia = "image" | "video";

interface AlgorithmSpec {
  queue: string;
  media: AlgorithmMedia;
}

const ALGORITHM_REGISTRY: Record<SupportedAlgorithm, AlgorithmSpec> = {
  animatediff: { queue: "video", media: "video" },
  deforum: { queue: "deforumvideo", media: "video" },
  uprez: { queue: "uprezvideo", media: "video" },
  "qwen-image": { queue: "qwenimage", media: "image" },
  "z-image-turbo": { queue: "zimageturbo", media: "image" },
  "flux-schnell": { queue: "falimage", media: "image" },
  "wan-t2v": { queue: "want2v", media: "video" },
  "wan-i2v": { queue: "wani2v", media: "video" },
  "wan-i2v-lora": { queue: "wani2vlora", media: "video" },
  "ltx-i2v": { queue: "ltxi2v", media: "video" },
  "kling-i2v": { queue: "falvideo", media: "video" },
  "kling-25-i2v": { queue: "falvideo", media: "video" },
  "nvidia-uprez": { queue: "nvidiavsr", media: "video" },
  discodiffusion: { queue: "discodiffusion", media: "video" },
  "flux-kontext-i2i": { queue: "falimage", media: "image" },
};

export const GENERATION_QUEUES: string[] = [
  ...new Set(Object.values(ALGORITHM_REGISTRY).map((spec) => spec.queue)),
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
  return ALGORITHM_REGISTRY[algorithm].queue;
};

export const isImageGenerationAlgorithm = (algorithm: string): boolean =>
  isValidAlgorithm(algorithm) &&
  ALGORITHM_REGISTRY[algorithm].media === "image";
