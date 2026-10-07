import {
  IMAGE_HEADER_BYTES,
  IMAGE_READ_TIMEOUT_MS,
  MAX_IMAGE_INPUT_BYTES,
  WEBP_EXTENSION,
} from "constants/image.constants";
import { Dream } from "entities";
import { APP_LOGGER } from "shared/logger";
import { DreamMediaType } from "types/dream.types";
import type { ImageNormalizeJobData } from "types/image.types";
import {
  digestImageStream,
  inspectImage,
  isNormalizedImage,
} from "utils/image.util";
import { hasGenerationAlgorithm } from "utils/prompt.util";
import { extractFileExtension, getObjectStream } from "utils/r2.util";
import { queueImageNormalizeJob } from "utils/worker-queue.util";
import {
  markDreamProcessed,
  MarkDreamProcessedResult,
} from "services/dream-processing.service";

export const requestImageNormalization = (
  jobData: ImageNormalizeJobData,
): void => {
  void queueImageNormalizeJob(jobData);
};

const canFinalizeInline = (dream: Dream, objectKey: string): boolean =>
  dream.mediaType === DreamMediaType.IMAGE &&
  extractFileExtension(objectKey) === WEBP_EXTENSION &&
  !hasGenerationAlgorithm(dream);

export const finalizeUploadedImageDream = async ({
  dream,
  objectKey,
  isAdmin,
}: {
  dream: Dream;
  objectKey: string;
  isAdmin: boolean;
}): Promise<MarkDreamProcessedResult | null> => {
  if (!canFinalizeInline(dream, objectKey)) return null;

  try {
    const stream = await getObjectStream(objectKey, {
      maxBytes: MAX_IMAGE_INPUT_BYTES,
      timeoutMs: IMAGE_READ_TIMEOUT_MS,
    });
    if (!stream) return null;

    const { md5, size, header } = await digestImageStream(
      stream,
      IMAGE_HEADER_BYTES,
    );
    const info = inspectImage(header);
    if (!info || !isNormalizedImage(info, "dream")) return null;

    return await markDreamProcessed({
      dream,
      isAdmin,
      video: objectKey,
      data: {
        processedVideoSize: size,
        processedMediaWidth: info.width,
        processedMediaHeight: info.height,
        md5,
        mediaType: DreamMediaType.IMAGE,
      },
    });
  } catch (error) {
    APP_LOGGER.error(
      `Inline image finalize failed for dream ${dream.uuid}, falling back to queue`,
      error,
    );
    return null;
  }
};
