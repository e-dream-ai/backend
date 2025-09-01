import { Request, Response } from "express";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import axios from "axios";
import { DreamStatusType } from "types/dream.types";
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

const testResults: {
  failures: FailedDownload[];
  stats: Record<string, string | number>;
  inProgress: boolean;
  startTime?: Date;
  endTime?: Date;
} = {
  failures: [],
  stats: {},
  inProgress: false,
};

/**
 * Run test asynchronously in background
 */
async function runTestAsync(limit: number | undefined, concurrency: number) {
  try {
    testResults.startTime = new Date();
    console.log(
      `🚀 Background test started at ${testResults.startTime.toISOString()}`,
    );

    const dreamRepository = appDataSource.getRepository(Dream);
    const queryBuilder = dreamRepository
      .createQueryBuilder("dream")
      .withDeleted()
      .where("dream.status = :status", { status: DreamStatusType.PROCESSED })
      .andWhere("dream.video IS NOT NULL")
      .orderBy("dream.created_at", "DESC");

    if (limit) {
      queryBuilder.limit(limit);
    }

    const dreams = await queryBuilder.getMany();
    const allFailures: FailedDownload[] = [];
    let processed = 0;
    let filesChecked = 0;
    let successfulDownloads = 0;

    console.log(
      `📊 Testing ${dreams.length} dreams with concurrency ${concurrency}`,
    );

    await processConcurrently(
      dreams,
      async (dream) => {
        const dreamFailures = await testDreamFiles(dream);

        // Count files checked
        let filesInDream = 0;
        if (dream.video) filesInDream++;

        filesChecked += filesInDream;

        if (dreamFailures.length > 0) {
          allFailures.push(...dreamFailures);
        } else {
          successfulDownloads += filesInDream;
        }

        processed++;
        if (processed % 100 === 0) {
          console.log(
            `📈 Progress: ${processed}/${dreams.length} dreams (${(
              (processed / dreams.length) *
              100
            ).toFixed(1)}%) - ${allFailures.length} failures so far`,
          );
        }
        return dreamFailures;
      },
      concurrency,
    );

    testResults.endTime = new Date();
    testResults.failures = allFailures;
    testResults.stats = {
      totalDreams: dreams.length,
      filesChecked: filesChecked,
      successfulDownloads: successfulDownloads,
      failedDownloads: allFailures.length,
      successRate: ((successfulDownloads / filesChecked) * 100).toFixed(2),
      uniqueDreamsWithFailures: new Set(allFailures.map((f) => f.uuid)).size,
      duration:
        (
          (testResults.endTime.getTime() - testResults.startTime!.getTime()) /
          1000
        ).toFixed(1) + "s",
    };
    testResults.inProgress = false;

    console.log(
      `✅ Background test completed in ${testResults.stats.duration}`,
    );
    console.log(
      `📊 Results: ${allFailures.length} failures, ${testResults.stats.successRate}% success rate`,
    );
  } catch (error) {
    testResults.endTime = new Date();
    testResults.inProgress = false;
    console.error("❌ Background test failed:", error);
  }
}

/**
 * Admin endpoint to start async test
 * GET /admin/start-test?limit=2000&concurrency=15
 */
export const handleStartTest = async (req: Request, res: Response) => {
  if (testResults.inProgress) {
    return res.json({
      success: false,
      message: "Test already in progress",
      startedAt: testResults.startTime?.toISOString(),
      checkStatusAt: "/api/v1/admin/test-status",
    });
  }

  const limit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : undefined;
  const concurrency = req.query.concurrency
    ? parseInt(req.query.concurrency as string, 10)
    : 25;

  // Reset results and start async process
  testResults.inProgress = true;
  testResults.failures = [];
  testResults.stats = {
    totalDreams: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
    filesChecked: 0,
  };
  testResults.startTime = undefined;
  testResults.endTime = undefined;

  // Don't await - let it run in background
  runTestAsync(limit, concurrency);

  return res.json({
    success: true,
    message: "Test started in background",
    parameters: { limit: limit || "no limit", concurrency },
    checkStatusAt: "/api/v1/admin/test-status",
    downloadAt: "/api/v1/admin/download-results",
  });
};

/**
 * Check test status
 * GET /admin/test-status
 */
export const handleTestStatus = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    inProgress: testResults.inProgress,
    startedAt: testResults.startTime?.toISOString(),
    endedAt: testResults.endTime?.toISOString(),
    currentFailures: testResults.failures.length,
    stats: testResults.stats,
    downloadReady: !testResults.inProgress && testResults.failures.length >= 0,
  });
};

/**
 * Download results when ready
 * GET /admin/download-results
 */
export const handleDownloadResults = async (req: Request, res: Response) => {
  if (testResults.inProgress) {
    return res.json({
      success: false,
      message:
        "Test still in progress. Check /api/v1/admin/test-status for updates.",
    });
  }

  if (!testResults.endTime) {
    return res.json({
      success: false,
      message:
        "No test results available. Start a test at /api/v1/admin/start-test",
    });
  }

  const filename = `dream-download-failures-${
    new Date().toISOString().split("T")[0]
  }.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const resultData = {
    metadata: {
      testCompletedAt: testResults.endTime.toISOString(),
      stats: testResults.stats,
    },
    failures: testResults.failures,
  };

  return res.send(JSON.stringify(resultData, null, 2));
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
      .andWhere("dream.video IS NOT NULL")
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
      .where("dream.status = :status", { status: DreamStatusType.PROCESSED })
      .andWhere("dream.video IS NOT NULL")
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
