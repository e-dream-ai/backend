import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "constants/file.constants";
import { DreamMediaType } from "types/dream.types";

export const detectMediaTypeFromExtension = (
  extension: string,
): DreamMediaType => {
  const cleanExtension = extension.toLowerCase().replace(/^\./, "");

  if (ALLOWED_IMAGE_TYPES.includes(cleanExtension)) {
    return DreamMediaType.IMAGE;
  }

  if (ALLOWED_VIDEO_TYPES.includes(cleanExtension)) {
    return DreamMediaType.VIDEO;
  }

  // Default to VIDEO for unknown extensions (backward compatibility)
  return DreamMediaType.VIDEO;
};
