import type { ImagePresetName } from "types/image.types";

export const IMAGE_MAX_DIMENSIONS = {
  dream: 4096,
  thumbnail: 2048,
  avatar: 1024,
} as const satisfies Record<ImagePresetName, number>;

export const WEBP_EXTENSION = "webp";
export const WEBP_MIME_TYPE = "image/webp";
export const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;
export const IMAGE_HEADER_BYTES = 64 * 1024;
export const IMAGE_READ_TIMEOUT_MS = 30_000;
