import "reflect-metadata";
import {
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client } from "clients/r2.client";
import env from "shared/env";
import path from "path";

const BUCKET_NAME = env.R2_BUCKET_NAME;

// MIME type mapping for supported image formats
const IMAGE_MIME_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",
  heif: "image/heif",
  heic: "image/heic",
};

// Image extensions we want to fix
const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "webp",
  "svg",
  "ico",
  "tiff",
  "tif",
  "heif",
  "heic",
];

interface FixStats {
  totalObjects: number;
  imageObjects: number;
  fixedObjects: number;
  skippedObjects: number;
  errorObjects: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

const getFileExtension = (objectKey: string): string => {
  return path.extname(objectKey).toLowerCase().slice(1);
};

const isImageFile = (objectKey: string): boolean => {
  const extension = getFileExtension(objectKey);
  return IMAGE_EXTENSIONS.includes(extension);
};

const getCorrectMimeType = (objectKey: string): string | null => {
  const extension = getFileExtension(objectKey);
  return IMAGE_MIME_TYPE_MAP[extension] || null;
};

const listAllObjects = async (): Promise<string[]> => {
  console.log("📋 Listing all objects in bucket...");

  const allObjects: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000, // Process in batches of 1000
    });

    try {
      const response = await r2Client.send(command);

      if (response.Contents) {
        const objectKeys = response.Contents.map((obj) => obj.Key).filter(
          (key): key is string => key !== undefined,
        );

        allObjects.push(...objectKeys);
        console.log(
          `  Found ${objectKeys.length} objects (total: ${allObjects.length})`,
        );
      }

      continuationToken = response.NextContinuationToken;
    } catch (error) {
      console.error("❌ Error listing objects:", error);
      throw error;
    }
  } while (continuationToken);

  console.log(`✅ Total objects found: ${allObjects.length}`);
  return allObjects;
};

const getCurrentContentType = async (
  objectKey: string,
): Promise<string | null> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const response = await r2Client.send(command);
    return response.ContentType || null;
  } catch (error) {
    console.error(`❌ Error getting content type for ${objectKey}:`, error);
    return null;
  }
};

const updateContentType = async (
  objectKey: string,
  newContentType: string,
): Promise<boolean> => {
  try {
    const command = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${encodeURIComponent(objectKey)}`,
      Key: objectKey,
      ContentType: newContentType,
      MetadataDirective: "REPLACE",
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error(`❌ Error updating content type for ${objectKey}:`, error);
    return false;
  }
};

const processBatch = async (
  objectKeys: string[],
  dryRun: boolean,
  stats: FixStats,
): Promise<void> => {
  for (const objectKey of objectKeys) {
    stats.totalObjects++;

    // Skip if not an image file
    if (!isImageFile(objectKey)) {
      continue;
    }

    stats.imageObjects++;

    // Get current content type
    const currentContentType = await getCurrentContentType(objectKey);
    const correctContentType = getCorrectMimeType(objectKey);

    if (!correctContentType) {
      console.warn(`⚠️  Unknown file type for: ${objectKey}`);
      stats.skippedObjects++;
      continue;
    }

    // Check if content type needs fixing
    if (currentContentType === correctContentType) {
      console.log(
        `✅ ${objectKey} already has correct content type: ${currentContentType}`,
      );
      stats.skippedObjects++;
      continue;
    }

    console.log(`🔧 ${objectKey}:`);
    console.log(`   Current: ${currentContentType || "undefined"}`);
    console.log(`   Correct: ${correctContentType}`);

    if (dryRun) {
      console.log(`   [DRY RUN] Would update content type`);
      stats.fixedObjects++;
    } else {
      const success = await updateContentType(objectKey, correctContentType);
      if (success) {
        console.log(`   ✅ Updated successfully`);
        stats.fixedObjects++;
      } else {
        console.log(`   ❌ Failed to update`);
        stats.errorObjects++;
        stats.errors.push({
          key: objectKey,
          error: "Failed to update content type",
        });
      }
    }
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");
  const batchSize = parseInt(
    args.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1] || "50",
  );

  console.log("🚀 Starting R2 image content type fix...");
  console.log(`📊 Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔢 Batch size: ${batchSize}`);
  console.log("─".repeat(60));

  const stats: FixStats = {
    totalObjects: 0,
    imageObjects: 0,
    fixedObjects: 0,
    skippedObjects: 0,
    errorObjects: 0,
    errors: [],
  };

  try {
    // List all objects in the bucket
    const allObjects = await listAllObjects();

    if (allObjects.length === 0) {
      console.log("ℹ️  No objects found in bucket");
      return;
    }

    // Filter for image objects only for initial reporting
    const imageObjects = allObjects.filter(isImageFile);
    console.log(
      `🖼️  Found ${imageObjects.length} image files out of ${allObjects.length} total objects`,
    );

    if (imageObjects.length === 0) {
      console.log("ℹ️  No image files found to process");
      return;
    }

    console.log("\n🔧 Processing objects...\n");

    // Process objects in batches
    for (let i = 0; i < allObjects.length; i += batchSize) {
      const batch = allObjects.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allObjects.length / batchSize);

      console.log(
        `\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} objects):`,
      );
      console.log("─".repeat(40));

      await processBatch(batch, dryRun, stats);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < allObjects.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 CONTENT TYPE FIX SUMMARY");
    console.log("=".repeat(60));

    console.log(`\n📁 Total objects processed: ${stats.totalObjects}`);
    console.log(`🖼️  Image objects found: ${stats.imageObjects}`);
    console.log(`✅ Objects fixed: ${stats.fixedObjects}`);
    console.log(
      `⏭️  Objects skipped (already correct): ${stats.skippedObjects}`,
    );
    console.log(`❌ Objects with errors: ${stats.errorObjects}`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      stats.errors.forEach(({ key, error }) => {
        console.log(`   - ${key}: ${error}`);
      });
    }

    if (dryRun) {
      console.log(
        `\n⚠️  This was a DRY RUN. No changes were made to the bucket.`,
      );
      console.log(`To execute the fixes, run:`);
      console.log(`npm run fix-image-content-types -- --execute`);
      console.log(`\nOptional parameters:`);
      console.log(`--batch-size=N  Process N objects per batch (default: 50)`);
    } else {
      console.log(`\n✅ Content type fix completed successfully!`);
      console.log(`🎯 Fixed ${stats.fixedObjects} image files`);
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
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
