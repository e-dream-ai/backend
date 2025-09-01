import { Request, Response } from "express";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import axios from "axios";
import { DreamStatusType, Frame } from "types/dream.types";
import httpStatus from "http-status";

interface FailedDownload {
  id: number;
  uuid: string;
  fileType: string;
  fileUrl: string;
  error: string;
}

interface DownloadStats {
  totalDreams: number;
  successfulDownloads: number;
  failedDownloads: number;
  filesChecked: number;
}

interface TestResult {
  stats: DownloadStats;
  failures: FailedDownload[];
  timestamp: string;
}

/**
 * Tests if a URL is downloadable by making a HEAD request
 */
const testDownload = async (url: string): Promise<boolean> => {
  try {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL");
    }

    const response = await axios.head(url, {
      timeout: 10000,
      validateStatus: (status) => status < 400,
    });

    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
};

/**
 * Tests all files for a single dream
 */
const testDreamFiles = async (dream: Dream): Promise<FailedDownload[]> => {
  const failures: FailedDownload[] = [];

  // Test video file
  if (dream.video) {
    try {
      const isAccessible = await testDownload(dream.video);
      if (!isAccessible) {
        failures.push({
          id: dream.id,
          uuid: dream.uuid,
          fileType: "video",
          fileUrl: dream.video,
          error: "File not accessible",
        });
      }
    } catch (error) {
      failures.push({
        id: dream.id,
        uuid: dream.uuid,
        fileType: "video",
        fileUrl: dream.video,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Test original video file
  if (dream.original_video) {
    try {
      const isAccessible = await testDownload(dream.original_video);
      if (!isAccessible) {
        failures.push({
          id: dream.id,
          uuid: dream.uuid,
          fileType: "original_video",
          fileUrl: dream.original_video,
          error: "File not accessible",
        });
      }
    } catch (error) {
      failures.push({
        id: dream.id,
        uuid: dream.uuid,
        fileType: "original_video",
        fileUrl: dream.original_video,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Test thumbnail file
  if (dream.thumbnail) {
    try {
      const isAccessible = await testDownload(dream.thumbnail);
      if (!isAccessible) {
        failures.push({
          id: dream.id,
          uuid: dream.uuid,
          fileType: "thumbnail",
          fileUrl: dream.thumbnail,
          error: "File not accessible",
        });
      }
    } catch (error) {
      failures.push({
        id: dream.id,
        uuid: dream.uuid,
        fileType: "thumbnail",
        fileUrl: dream.thumbnail,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Test filmstrip files
  if (dream.filmstrip && Array.isArray(dream.filmstrip)) {
    for (let i = 0; i < dream.filmstrip.length; i++) {
      const frame = dream.filmstrip[i];
      let frameUrl: string | null = null;

      if (typeof frame === "string") {
        frameUrl = frame;
      } else if (frame && typeof frame === "object" && "url" in frame) {
        frameUrl = (frame as Frame).url;
      }

      if (frameUrl) {
        try {
          const isAccessible = await testDownload(frameUrl);
          if (!isAccessible) {
            failures.push({
              id: dream.id,
              uuid: dream.uuid,
              fileType: `filmstrip_frame_${i}`,
              fileUrl: frameUrl,
              error: "File not accessible",
            });
          }
        } catch (error) {
          failures.push({
            id: dream.id,
            uuid: dream.uuid,
            fileType: `filmstrip_frame_${i}`,
            fileUrl: frameUrl,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }
  }

  return failures;
};

/**
 * Process items with controlled concurrency
 */
const processConcurrently = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        results[currentIndex] = await processor(item, currentIndex);
      } catch (error) {
        console.error(`Error processing item ${currentIndex}:`, error);
        results[currentIndex] = error as R;
      }
    }
  };

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
};

/**
 * Admin endpoint to test dream file downloads
 * GET /admin/test-dream-downloads?limit=100&concurrency=25
 */
export const handleTestDreamDownloads = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const concurrency = req.query.concurrency
      ? parseInt(req.query.concurrency as string, 10)
      : 25;

    console.log(`🚀 Starting dream file download test via API...`);
    console.log(`📊 Limit: ${limit}`);
    console.log(`⚡ Concurrency: ${concurrency}`);

    const allFailures: FailedDownload[] = [];
    const stats: DownloadStats = {
      totalDreams: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      filesChecked: 0,
    };

    // Get dreams from database
    const dreamRepository = appDataSource.getRepository(Dream);
    const queryBuilder = dreamRepository
      .createQueryBuilder("dream")
      .withDeleted()
      .where("dream.status = :status", { status: DreamStatusType.PROCESSED })
      .andWhere(
        "(dream.video IS NOT NULL OR dream.original_video IS NOT NULL OR dream.thumbnail IS NOT NULL OR dream.filmstrip IS NOT NULL)",
      )
      .orderBy("dream.created_at", "DESC")
      .limit(limit);

    const dreams = await queryBuilder.getMany();
    stats.totalDreams = dreams.length;

    console.log(`Found ${dreams.length} dreams to test`);

    // Process dreams with controlled concurrency
    await processConcurrently(
      dreams,
      async (dream) => {
        const dreamFailures = await testDreamFiles(dream);

        // Count files checked
        let filesInDream = 0;
        if (dream.video) filesInDream++;
        if (dream.original_video) filesInDream++;
        if (dream.thumbnail) filesInDream++;
        if (dream.filmstrip && Array.isArray(dream.filmstrip)) {
          filesInDream += dream.filmstrip.length;
        }

        stats.filesChecked += filesInDream;

        if (dreamFailures.length > 0) {
          allFailures.push(...dreamFailures);
          stats.failedDownloads += dreamFailures.length;
        } else {
          stats.successfulDownloads += filesInDream;
        }

        return dreamFailures;
      },
      concurrency,
    );

    const result: TestResult = {
      stats,
      failures: allFailures,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Test completed. ${stats.failedDownloads} failures found.`);

    return res.status(httpStatus.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Dream download test failed:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleDownloadFailures = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const concurrency = req.query.concurrency
      ? parseInt(req.query.concurrency as string, 10)
      : 25;

    console.log(`🚀 Running dream download test for JSON download...`);

    // Reuse the same logic as above
    const dreamRepository = appDataSource.getRepository(Dream);
    const queryBuilder = dreamRepository
      .createQueryBuilder("dream")
      .withDeleted()
      .andWhere(
        "(dream.video IS NOT NULL OR dream.original_video IS NOT NULL OR dream.thumbnail IS NOT NULL OR dream.filmstrip IS NOT NULL)",
      )
      .orderBy("dream.created_at", "DESC")
      .limit(limit);

    const dreams = await queryBuilder.getMany();
    const allFailures: FailedDownload[] = [];

    await processConcurrently(
      dreams,
      async (dream) => {
        const dreamFailures = await testDreamFiles(dream);
        if (dreamFailures.length > 0) {
          allFailures.push(...dreamFailures);
        }
        return dreamFailures;
      },
      concurrency,
    );

    // Set headers for file download
    const filename = `dream-download-failures-${
      new Date().toISOString().split("T")[0]
    }.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.send(JSON.stringify(allFailures, null, 2));
  } catch (error) {
    console.error("❌ Download failures endpoint failed:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
