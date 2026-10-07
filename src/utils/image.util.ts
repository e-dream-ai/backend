import { createHash } from "crypto";
import type { Readable } from "stream";
import { imageSize } from "image-size";
import {
  IMAGE_MAX_DIMENSIONS,
  WEBP_EXTENSION,
  WEBP_MIME_TYPE,
} from "constants/image.constants";
import { MYME_TYPES_EXTENSIONS } from "constants/file.constants";
import env from "shared/env";
import type {
  ImageDigest,
  ImageInfo,
  ImagePresetName,
  PreparedImageUpload,
} from "types/image.types";
import { extractFileExtension } from "utils/r2.util";

export const digestImageStream = async (
  stream: Readable,
  headerBytes: number,
): Promise<ImageDigest> => {
  const hash = createHash("md5");
  const headerChunks: Buffer[] = [];
  let headerLength = 0;
  let size = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    hash.update(buffer);
    size += buffer.length;
    if (headerLength < headerBytes) {
      headerChunks.push(buffer);
      headerLength += buffer.length;
    }
  }

  return {
    md5: hash.digest("hex"),
    size,
    header: Buffer.concat(headerChunks).subarray(0, headerBytes),
  };
};

export const inspectImage = (buffer: Uint8Array): ImageInfo | null => {
  try {
    const { type, width, height, orientation } = imageSize(buffer);
    if (!type || !width || !height) return null;
    return { type, width, height, orientation };
  } catch {
    return null;
  }
};

export const isNormalizedImage = (
  info: ImageInfo,
  preset: ImagePresetName,
): boolean =>
  info.type === WEBP_EXTENSION &&
  (info.orientation === undefined || info.orientation === 1) &&
  Math.max(info.width, info.height) <= IMAGE_MAX_DIMENSIONS[preset];

export const prepareImageUpload = (
  file: Express.Multer.File,
  preset: ImagePresetName,
): PreparedImageUpload => {
  const info = env.IMAGE_NORMALIZE ? inspectImage(file.buffer) : null;

  if (info && isNormalizedImage(info, preset)) {
    return {
      buffer: file.buffer,
      contentType: WEBP_MIME_TYPE,
      extension: WEBP_EXTENSION,
      needsNormalization: false,
    };
  }

  return {
    buffer: file.buffer,
    contentType: file.mimetype,
    extension:
      MYME_TYPES_EXTENSIONS[file.mimetype] ??
      extractFileExtension(file.originalname),
    needsNormalization: env.IMAGE_NORMALIZE,
  };
};
