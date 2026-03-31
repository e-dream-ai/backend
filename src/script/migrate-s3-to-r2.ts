import "reflect-metadata";
import appDataSource from "database/app-data-source";
import { Dream, Keyframe, Playlist, User } from "entities";
import { IsNull, Not } from "typeorm";

// Constants for server addresses
const S3_SERVER_ADDRESS =
  "https://edream-storage-dreams-staging.s3.us-east-1.amazonaws.com";
const R2_SERVER_ADDRESS = "https://your-r2-domain.com";

interface MigrationStats {
  dreams: {
    total: number;
    migrated: {
      video: number;
      originalVideo: number;
      thumbnail: number;
      filmstrip: number;
    };
  };
  keyframes: {
    total: number;
    migrated: {
      image: number;
    };
  };
  playlists: {
    total: number;
    migrated: {
      thumbnail: number;
    };
  };
  users: {
    total: number;
    migrated: {
      avatar: number;
    };
  };
}

/**
 * Replaces S3 server address with R2 server address in a URL
 */
const migrateUrl = (url: string | null, r2Domain: string): string | null => {
  if (!url || typeof url !== "string") {
    return url;
  }

  if (url.startsWith(S3_SERVER_ADDRESS)) {
    return url.replace(S3_SERVER_ADDRESS, r2Domain);
  }

  return url;
};

type Frame = { frameNumber: number; url: string };
type FilmstripArray = string[] | Frame[];

/**
 * Migrates filmstrip URLs
 */
const migrateFilmstrip = (
  filmstrip: FilmstripArray | null | undefined,
  r2Domain: string,
): FilmstripArray | null | undefined => {
  if (!filmstrip || !Array.isArray(filmstrip)) {
    return filmstrip;
  }

  return filmstrip.map((item) => {
    if (typeof item === "string") {
      return migrateUrl(item, r2Domain) || item;
    } else if (item && typeof item === "object" && "url" in item) {
      return {
        ...item,
        url: migrateUrl(item.url, r2Domain) || item.url,
      };
    }
    return item;
  }) as FilmstripArray;
};

/**
 * Migrates Dream entities
 */
const migrateDreams = async (
  dryRun: boolean = true,
  r2Domain: string,
): Promise<MigrationStats["dreams"]> => {
  const dreamRepository = appDataSource.getRepository(Dream);

  const dreams = await dreamRepository
    .createQueryBuilder("dream")
    .withDeleted()
    .where("dream.video LIKE :s3Url", { s3Url: `${S3_SERVER_ADDRESS}%` })
    .orWhere("dream.original_video LIKE :s3Url", {
      s3Url: `${S3_SERVER_ADDRESS}%`,
    })
    .orWhere("dream.thumbnail LIKE :s3Url", { s3Url: `${S3_SERVER_ADDRESS}%` })
    .orWhere("dream.filmstrip::text LIKE :s3Url", {
      s3Url: `%${S3_SERVER_ADDRESS}%`,
    })
    .getMany();

  console.log(`Found ${dreams.length} dreams with S3 URLs to migrate`);

  const stats = {
    total: dreams.length,
    migrated: {
      video: 0,
      originalVideo: 0,
      thumbnail: 0,
      filmstrip: 0,
    },
  };

  for (const dream of dreams) {
    let hasChanges = false;

    // Migrate video URL
    if (dream.video && dream.video.startsWith(S3_SERVER_ADDRESS)) {
      dream.video = migrateUrl(dream.video, r2Domain);
      stats.migrated.video++;
      hasChanges = true;
    }

    // Migrate original_video URL
    if (
      dream.original_video &&
      dream.original_video.startsWith(S3_SERVER_ADDRESS)
    ) {
      dream.original_video = migrateUrl(dream.original_video, r2Domain);
      stats.migrated.originalVideo++;
      hasChanges = true;
    }

    // Migrate thumbnail URL
    if (dream.thumbnail && dream.thumbnail.startsWith(S3_SERVER_ADDRESS)) {
      dream.thumbnail = migrateUrl(dream.thumbnail, r2Domain);
      stats.migrated.thumbnail++;
      hasChanges = true;
    }

    // Migrate filmstrip URLs
    if (dream.filmstrip && Array.isArray(dream.filmstrip)) {
      const originalFilmstrip = JSON.stringify(dream.filmstrip);
      dream.filmstrip = migrateFilmstrip(dream.filmstrip, r2Domain) as
        | string[]
        | Frame[];
      const newFilmstrip = JSON.stringify(dream.filmstrip);

      if (originalFilmstrip !== newFilmstrip) {
        stats.migrated.filmstrip++;
        hasChanges = true;
      }
    }

    if (hasChanges && !dryRun) {
      await dreamRepository.save(dream);
      console.log(`✓ Migrated dream ${dream.uuid}`);
    } else if (hasChanges && dryRun) {
      console.log(`[DRY RUN] Would migrate dream ${dream.uuid}`);
    }
  }

  return stats;
};

/**
 * Migrates Keyframe entities
 */
const migrateKeyframes = async (
  dryRun: boolean = true,
  r2Domain: string,
): Promise<MigrationStats["keyframes"]> => {
  const keyframeRepository = appDataSource.getRepository(Keyframe);

  const keyframes = await keyframeRepository.find({
    where: {
      image: Not(IsNull()),
    },
    withDeleted: true,
  });

  const keyframesToMigrate = keyframes.filter(
    (keyframe) =>
      keyframe.image && keyframe.image.startsWith(S3_SERVER_ADDRESS),
  );

  console.log(
    `Found ${keyframesToMigrate.length} keyframes with S3 URLs to migrate`,
  );

  const stats = {
    total: keyframesToMigrate.length,
    migrated: {
      image: 0,
    },
  };

  for (const keyframe of keyframesToMigrate) {
    if (keyframe.image && keyframe.image.startsWith(S3_SERVER_ADDRESS)) {
      keyframe.image = migrateUrl(keyframe.image, r2Domain);
      stats.migrated.image++;

      if (!dryRun) {
        await keyframeRepository.save(keyframe);
        console.log(`✓ Migrated keyframe ${keyframe.uuid}`);
      } else {
        console.log(`[DRY RUN] Would migrate keyframe ${keyframe.uuid}`);
      }
    }
  }

  return stats;
};

/**
 * Migrates Playlist entities
 */
const migratePlaylists = async (
  dryRun: boolean = true,
  r2Domain: string,
): Promise<MigrationStats["playlists"]> => {
  const playlistRepository = appDataSource.getRepository(Playlist);

  const playlists = await playlistRepository.find({
    where: {
      thumbnail: Not(IsNull()),
    },
    withDeleted: true,
  });

  const playlistsToMigrate = playlists.filter(
    (playlist) =>
      playlist.thumbnail && playlist.thumbnail.startsWith(S3_SERVER_ADDRESS),
  );

  console.log(
    `Found ${playlistsToMigrate.length} playlists with S3 URLs to migrate`,
  );

  const stats = {
    total: playlistsToMigrate.length,
    migrated: {
      thumbnail: 0,
    },
  };

  for (const playlist of playlistsToMigrate) {
    if (
      playlist.thumbnail &&
      playlist.thumbnail.startsWith(S3_SERVER_ADDRESS)
    ) {
      playlist.thumbnail = migrateUrl(playlist.thumbnail, r2Domain);
      stats.migrated.thumbnail++;

      if (!dryRun) {
        await playlistRepository.save(playlist);
        console.log(`✓ Migrated playlist ${playlist.uuid}`);
      } else {
        console.log(`[DRY RUN] Would migrate playlist ${playlist.uuid}`);
      }
    }
  }

  return stats;
};

/**
 * Migrates User entities
 */
const migrateUsers = async (
  dryRun: boolean = true,
  r2Domain: string,
): Promise<MigrationStats["users"]> => {
  const userRepository = appDataSource.getRepository(User);

  const users = await userRepository.find({
    where: {
      avatar: Not(IsNull()),
    },
    withDeleted: true,
  });

  const usersToMigrate = users.filter(
    (user) => user.avatar && user.avatar.startsWith(S3_SERVER_ADDRESS),
  );

  console.log(
    `Found ${usersToMigrate.length} users with S3 avatar URLs to migrate`,
  );

  const stats = {
    total: usersToMigrate.length,
    migrated: {
      avatar: 0,
    },
  };

  for (const user of usersToMigrate) {
    if (user.avatar && user.avatar.startsWith(S3_SERVER_ADDRESS)) {
      user.avatar = migrateUrl(user.avatar, r2Domain);
      stats.migrated.avatar++;

      if (!dryRun) {
        await userRepository.save(user);
        console.log(`✓ Migrated user ${user.uuid}`);
      } else {
        console.log(`[DRY RUN] Would migrate user ${user.uuid}`);
      }
    }
  }

  return stats;
};

/**
 * Main migration function
 */
const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");
  const newServerAddress = args
    .find((arg) => arg.startsWith("--r2-domain="))
    ?.split("=")[1];

  if (!newServerAddress && !dryRun) {
    console.error(
      "❌ Error: Please provide the new R2 domain using --r2-domain=https://your-domain.com",
    );
    console.error(
      "Example: npm run migrate:s3-to-r2 -- --r2-domain=https://pub-1234567890abcdef.r2.dev --execute",
    );
    process.exit(1);
  }

  if (newServerAddress) {
    const R2_SERVER_ADDRESS_UPDATED = newServerAddress;
    console.log(`🔄 Using R2 server address: ${R2_SERVER_ADDRESS_UPDATED}`);
  }

  console.log("🚀 Starting S3 to R2 migration...");
  console.log(`📊 Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`🔗 From: ${S3_SERVER_ADDRESS}`);
  console.log(`🔗 To: ${newServerAddress || R2_SERVER_ADDRESS}`);
  console.log("─".repeat(50));

  try {
    // Initialize the data source
    await appDataSource.initialize();
    console.log("✅ Database connection established");

    // Use the provided R2 domain or fallback to default
    const activeR2Domain = newServerAddress || R2_SERVER_ADDRESS;

    // Perform migrations
    console.log("\n🎬 Migrating Dreams...");
    const dreamStats = await migrateDreams(dryRun, activeR2Domain);

    console.log("\n🖼️  Migrating Keyframes...");
    const keyframeStats = await migrateKeyframes(dryRun, activeR2Domain);

    console.log("\n📋 Migrating Playlists...");
    const playlistStats = await migratePlaylists(dryRun, activeR2Domain);

    console.log("\n👤 Migrating Users...");
    const userStats = await migrateUsers(dryRun, activeR2Domain);

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));

    console.log(`\n🎬 Dreams (${dreamStats.total} total):`);
    console.log(`   - Video URLs: ${dreamStats.migrated.video}`);
    console.log(
      `   - Original Video URLs: ${dreamStats.migrated.originalVideo}`,
    );
    console.log(`   - Thumbnail URLs: ${dreamStats.migrated.thumbnail}`);
    console.log(`   - Filmstrip URLs: ${dreamStats.migrated.filmstrip}`);

    console.log(`\n🖼️  Keyframes (${keyframeStats.total} total):`);
    console.log(`   - Image URLs: ${keyframeStats.migrated.image}`);

    console.log(`\n📋 Playlists (${playlistStats.total} total):`);
    console.log(`   - Thumbnail URLs: ${playlistStats.migrated.thumbnail}`);

    console.log(`\n👤 Users (${userStats.total} total):`);
    console.log(`   - Avatar URLs: ${userStats.migrated.avatar}`);

    const totalMigrated =
      Object.values(dreamStats.migrated).reduce((a, b) => a + b, 0) +
      Object.values(keyframeStats.migrated).reduce((a, b) => a + b, 0) +
      Object.values(playlistStats.migrated).reduce((a, b) => a + b, 0) +
      Object.values(userStats.migrated).reduce((a, b) => a + b, 0);

    console.log(`\n✨ Total URLs migrated: ${totalMigrated}`);

    if (dryRun) {
      console.log(
        "\n⚠️  This was a DRY RUN. No changes were made to the database.",
      );
      console.log("To execute the migration, run:");
      console.log(
        "npm run migrate:s3-to-r2 -- --r2-domain=https://your-domain.com --execute",
      );
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
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
