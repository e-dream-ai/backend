import { FILE_EXTENSIONS } from "constants/file.constants";
import { dreamRepository } from "database/repositories";
import { Dream } from "entities";
import {
  DreamMediaType,
  DreamStatusType,
  Frame,
  UpdateDreamProcessedRequest,
} from "types/dream.types";
import {
  createFeedItem,
  findDreamPlaylistItems,
  getDreamSelectedColumns,
} from "utils/dream.util";
import { getRetainedOwner } from "utils/ownership.util";
import {
  computePlaylistThumbnailRecursive,
  refreshPlaylistUpdatedAtTimestampFromPlaylistItems,
} from "utils/playlist.util";
import {
  clearFilmstripVersion,
  getFilmstripVersion,
} from "utils/uploadVersion.util";
import { getUserIdentifier } from "utils/user.util";
import { emitDreamJobStatus } from "services/job-progress.service";

export interface MarkDreamProcessedResult {
  dream: Dream;
  ownerUuid: string;
}

const buildFilmstripFrames = (
  ownerIdentifier: string,
  dreamUuid: string,
  frames: number[],
  version?: number,
): Frame[] =>
  frames.map(
    (frame) =>
      ({
        frameNumber: Number(frame),
        url: version
          ? `${ownerIdentifier}/${dreamUuid}/filmstrip/${version}/frame-${frame}.${FILE_EXTENSIONS.JPG}`
          : `${ownerIdentifier}/${dreamUuid}/filmstrip/frame-${frame}.${FILE_EXTENSIONS.JPG}`,
      }) as Frame,
  );

export const markDreamProcessed = async ({
  dream,
  data,
  isAdmin,
  video,
}: {
  dream: Dream;
  data: UpdateDreamProcessedRequest;
  isAdmin: boolean;
  video?: string;
}): Promise<MarkDreamProcessedResult> => {
  const dreamUuid = dream.uuid;
  const owner = await getRetainedOwner(dream);
  const filmstripVersion = data.filmstrip
    ? await getFilmstripVersion(dreamUuid)
    : undefined;
  const filmstrip = data.filmstrip?.map(Number);
  const mediaType = data.mediaType ?? dream.mediaType;
  const isImage = mediaType === DreamMediaType.IMAGE;

  if (filmstripVersion) await clearFilmstripVersion(dreamUuid);

  const updateData: Partial<Dream> = {
    status: DreamStatusType.PROCESSED,
    processed_at: new Date(),
    processedVideoSize: data.processedVideoSize,
    processedVideoFrames: data.processedVideoFrames,
    processedVideoFPS: data.processedVideoFPS,
    processedMediaWidth: data.processedMediaWidth,
    processedMediaHeight: data.processedMediaHeight,
    render_duration: data.render_duration,
    activityLevel: data.activityLevel,
    md5: data.md5,
    reservedCostUsd: null,
  };

  if (video) updateData.video = video;

  if (isImage) {
    updateData.filmstrip = null as unknown as Frame[];
    const processedImage = video ?? dream.video;
    if (processedImage) updateData.thumbnail = processedImage;
  } else if (filmstrip) {
    updateData.filmstrip = buildFilmstripFrames(
      getUserIdentifier(owner),
      dreamUuid,
      filmstrip,
      filmstripVersion,
    );
  }

  if (data.mediaType) updateData.mediaType = data.mediaType;

  await dreamRepository.update(dream.id, updateData);

  const [updatedDream, playlistItems] = await Promise.all([
    dreamRepository.findOneOrFail({
      where: { uuid: dreamUuid },
      relations: { user: true },
      select: getDreamSelectedColumns(),
    }),
    findDreamPlaylistItems(dreamUuid, owner.id, isAdmin),
  ]);

  await Promise.all(
    playlistItems.map(async (playlistItem) => {
      const playlist = playlistItem.playlist;
      if (!playlist || playlist.thumbnail) return;

      const fallbackThumbnail = await computePlaylistThumbnailRecursive(
        playlist.id,
        {
          userId: owner.id,
          isAdmin,
          nsfw: owner.nsfw,
          onlyProcessedDreams: true,
          rootPlaylistNsfw: playlist.nsfw,
        },
      );
      if (fallbackThumbnail) playlist.thumbnail = fallbackThumbnail;
    }),
  );

  updatedDream.playlistItems = playlistItems;

  await Promise.all([
    createFeedItem(updatedDream),
    refreshPlaylistUpdatedAtTimestampFromPlaylistItems(
      playlistItems.map((playlistItem) => playlistItem.id),
    ),
  ]);

  await emitDreamJobStatus({
    userId: owner.id,
    dreamUuid,
    status: DreamStatusType.PROCESSED,
  });

  return { dream: updatedDream, ownerUuid: owner.uuid };
};
