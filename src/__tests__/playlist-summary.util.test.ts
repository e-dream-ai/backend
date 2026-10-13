import { DreamMediaType, DreamStatusType } from "types/dream.types";

type DreamRow = {
  id: number;
  processedMediaWidth?: number | null;
  processedMediaHeight?: number | null;
  processedVideoFPS?: number | string | null;
  processedVideoFrames?: number | null;
  mediaType?: DreamMediaType;
  status?: DreamStatusType;
};

const loadWithDreams = async (dreams: DreamRow[]) => {
  const items = dreams.map((dream) => ({
    id: dream.id,
    playlist: { id: 1 },
    dreamItem: {
      uuid: `d${dream.id}`,
      status: DreamStatusType.PROCESSED,
      mediaType: DreamMediaType.VIDEO,
      ...dream,
    },
    playlistItem: null,
  }));
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    "select",
    "leftJoin",
    "addSelect",
    "where",
    "andWhere",
  ]) {
    builder[method] = jest.fn(() => builder);
  }
  builder.getMany = jest.fn().mockResolvedValue(items);

  jest.doMock("database/repositories", () => ({
    __esModule: true,
    playlistItemRepository: { createQueryBuilder: () => builder },
  }));
  jest.doMock("services/job-progress.service", () => ({
    __esModule: true,
    getDreamProgressSnapshots: jest.fn().mockResolvedValue(new Map()),
  }));
  jest.doMock("utils/playlist.util", () => ({ __esModule: true }));

  const { computePlaylistTotals } = await import("utils/playlist-summary.util");
  return computePlaylistTotals(1, { userId: 1, isAdmin: true });
};

describe("computePlaylistTotals media summary", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("reports a uniform resolution and fps", async () => {
    const { media } = await loadWithDreams([
      {
        id: 1,
        processedMediaWidth: 1280,
        processedMediaHeight: 720,
        processedVideoFPS: "24.00",
      },
      {
        id: 2,
        processedMediaWidth: 1280,
        processedMediaHeight: 720,
        processedVideoFPS: "24.00",
      },
    ]);
    expect(media).toEqual({
      width: 1280,
      height: 720,
      minShortSide: 720,
      fps: 24,
      mixedResolution: false,
      mixedFps: false,
    });
  });

  it("reports the largest resolution and highest fps when mixed", async () => {
    const { media } = await loadWithDreams([
      {
        id: 1,
        processedMediaWidth: 1280,
        processedMediaHeight: 720,
        processedVideoFPS: 24,
      },
      {
        id: 2,
        processedMediaWidth: 1920,
        processedMediaHeight: 1080,
        processedVideoFPS: 16,
      },
      {
        id: 3,
        processedMediaWidth: 1080,
        processedMediaHeight: 1920,
        processedVideoFPS: 30,
      },
    ]);
    expect(media).toEqual({
      width: 1920,
      height: 1080,
      minShortSide: 720,
      fps: 30,
      mixedResolution: true,
      mixedFps: true,
    });
  });

  it("ignores images, unprocessed dreams and unknown resolutions", async () => {
    const { media } = await loadWithDreams([
      {
        id: 1,
        processedMediaWidth: 4096,
        processedMediaHeight: 4096,
        mediaType: DreamMediaType.IMAGE,
      },
      {
        id: 2,
        processedMediaWidth: 3840,
        processedMediaHeight: 2160,
        status: DreamStatusType.QUEUE,
      },
      { id: 3, processedMediaWidth: null, processedMediaHeight: null },
      {
        id: 4,
        processedMediaWidth: 1280,
        processedMediaHeight: 720,
        processedVideoFPS: 24,
      },
    ]);
    expect(media).toMatchObject({
      width: 1280,
      height: 720,
      mixedResolution: false,
    });
  });

  it("sums frames across dreams", async () => {
    const { totalFrames } = await loadWithDreams([
      { id: 1, processedVideoFrames: 120 },
      { id: 2, processedVideoFrames: 48 },
      { id: 3 },
    ]);
    expect(totalFrames).toBe(168);
  });

  it("is null when nothing has a known resolution", async () => {
    const { media } = await loadWithDreams([{ id: 1 }]);
    expect(media).toBeNull();
  });
});
