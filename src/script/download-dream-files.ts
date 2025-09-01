import "reflect-metadata";
import appDataSource from "database/app-data-source";
import { Dream } from "entities";
import axios from "axios";
import { writeFileSync } from "fs";
import { DreamStatusType, Frame } from "types/dream.types";

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

  // Create worker promises up to concurrency limit
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
};

const main = async () => {
  const args = process.argv.slice(2);
  const limitStr = args
    .find((arg) => arg.startsWith("--limit="))
    ?.split("=")[1];
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const outputFile =
    args.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
    "failed-downloads.json";
  const concurrencyStr = args
    .find((arg) => arg.startsWith("--concurrency="))
    ?.split("=")[1];
  const concurrency = concurrencyStr ? parseInt(concurrencyStr, 10) : 50;

  console.log("🚀 Starting dream file download test...");
  console.log(`📊 Limit: ${limit || "No limit"}`);
  console.log(`📁 Output file: ${outputFile}`);
  console.log(`⚡ Concurrency: ${concurrency} dreams at once`);
  console.log("─".repeat(50));

  const allFailures: FailedDownload[] = [];
  const stats: DownloadStats = {
    totalDreams: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
    filesChecked: 0,
  };

  try {
    // Initialize the data source
    await appDataSource.initialize();
    console.log("✅ Database connection established");

    // Get dreams from database
    const dreamRepository = appDataSource.getRepository(Dream);
    const queryBuilder = dreamRepository
      .createQueryBuilder("dream")
      .withDeleted()
      .where("dream.status = :status", { status: DreamStatusType.PROCESSED })
      .andWhere(
        "(dream.video IS NOT NULL OR dream.original_video IS NOT NULL OR dream.thumbnail IS NOT NULL OR dream.filmstrip IS NOT NULL)",
      )
      .orderBy("dream.created_at", "DESC");

    if (limit) {
      queryBuilder.limit(limit);
    }

    const dreams = await queryBuilder.getMany();
    stats.totalDreams = dreams.length;

    console.log(`Found ${dreams.length} dreams to test`);

    // Process dreams with controlled concurrency
    let processedCount = 0;
    const progressInterval = Math.max(1, Math.floor(dreams.length / 20)); // Show progress 20 times

    await processConcurrently(
      dreams,
      async (dream, index) => {
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
          console.log(
            `❌ Dream ${dream.uuid}: ${dreamFailures.length} failed files`,
          );
        } else {
          stats.successfulDownloads += filesInDream;
          if (index % progressInterval === 0 || dreamFailures.length > 0) {
            console.log(`✅ Dream ${dream.uuid}: All files accessible`);
          }
        }

        processedCount++;
        if (processedCount % progressInterval === 0) {
          const percentage = ((processedCount / dreams.length) * 100).toFixed(
            1,
          );
          console.log(
            `📊 Progress: ${processedCount}/${dreams.length} dreams (${percentage}%)`,
          );
        }

        return dreamFailures;
      },
      concurrency,
    );

    // Write failures to JSON file
    writeFileSync(outputFile, JSON.stringify(allFailures, null, 2));

    console.log("\n" + "=".repeat(50));
    console.log("📊 DOWNLOAD TEST SUMMARY");
    console.log("=".repeat(50));
    console.log(`\n🎬 Dreams tested: ${stats.totalDreams}`);
    console.log(`📁 Total files checked: ${stats.filesChecked}`);
    console.log(`✅ Successful downloads: ${stats.successfulDownloads}`);
    console.log(`❌ Failed downloads: ${stats.failedDownloads}`);
    console.log(`📄 Failed downloads saved to: ${outputFile}`);

    if (allFailures.length > 0) {
      console.log(`\n🔍 Failure breakdown:`);
      const failuresByType = allFailures.reduce(
        (acc, failure) => {
          acc[failure.fileType] = (acc[failure.fileType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(failuresByType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} failures`);
      });

      console.log(
        `\n🚫 Unique dreams with failures: ${
          new Set(allFailures.map((f) => f.uuid)).size
        }`,
      );
    }

    console.log(
      `\n📊 Success rate: ${(
        (stats.successfulDownloads / stats.filesChecked) *
        100
      ).toFixed(2)}%`,
    );

    // For Heroku: Also output JSON data to console if there are failures
    if (allFailures.length > 0) {
      console.log("\n" + "=".repeat(50));
      console.log("🔍 FAILED DOWNLOADS JSON DATA");
      console.log("=".repeat(50));
      console.log("Copy the JSON below to save failed downloads:");
      console.log("\n--- START JSON ---");
      console.log(JSON.stringify(allFailures, null, 2));
      console.log("--- END JSON ---\n");
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await appDataSource.destroy();
    process.exit(0);
  }
};

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
