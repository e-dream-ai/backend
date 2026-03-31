import "reflect-metadata";
import appDataSource from "database/app-data-source";
import { Dream, Keyframe, Playlist, User } from "entities";
import { IsNull, Not } from "typeorm";

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

const extractObjectKey = (url: string | null): string | null => {
  if (!url || typeof url !== "string") {
    return url;
  }

  try {
    const urlObj = new URL(url);

    // Remove leading slash and return the path as object key
    const objectKey = urlObj.pathname.substring(1);

    // If there's no meaningful path, return the original URL
    if (!objectKey || objectKey === "") {
      console.warn(`No meaningful path found in URL: ${url}`);
      return url;
    }

    // Log the transformation for debugging
    console.log(`Extracted object key: ${url} -> ${objectKey}`);

    return objectKey;
  } catch (error) {
    // If URL parsing fails, try to extract from the end of the string
    console.warn(`Failed to parse URL: ${url}, attempting fallback extraction`);
    const lastSlashIndex = url.lastIndexOf("/");
    if (lastSlashIndex !== -1 && lastSlashIndex < url.length - 1) {
      const fallbackKey = url.substring(lastSlashIndex + 1);
      console.log(`Fallback extraction: ${url} -> ${fallbackKey}`);
      return fallbackKey;
    }
    console.warn(`Could not extract object key from: ${url}`);
    return url;
  }
};

type Frame = { frameNumber: number; url: string };
type FilmstripArray = string[] | Frame[];

const extractFilmstripObjectKeys = (
  filmstrip: FilmstripArray | null | undefined,
): FilmstripArray | null | undefined => {
  if (!filmstrip || !Array.isArray(filmstrip)) {
    return filmstrip;
  }

  return filmstrip.map((item) => {
    if (typeof item === "string") {
      return extractObjectKey(item) || item;
    } else if (item && typeof item === "object" && "url" in item) {
      return {
        ...item,
        url: extractObjectKey(item.url) || item.url,
      };
    }
    return item;
  }) as FilmstripArray;
};

const migrateDreams = async (
  dryRun: boolean = true,
): Promise<MigrationStats["dreams"]> => {
  const dreamRepository = appDataSource.getRepository(Dream);

  const dreams = await dreamRepository
    .createQueryBuilder("dream")
    .withDeleted()
    .where("dream.video LIKE :httpUrl", { httpUrl: `http%` })
    .orWhere("dream.original_video LIKE :httpUrl", { httpUrl: `http%` })
    .orWhere("dream.thumbnail LIKE :httpUrl", { httpUrl: `http%` })
    .orWhere("dream.filmstrip::text LIKE :httpUrl", { httpUrl: `%http%` })
    .getMany();

  console.log(
    `Found ${dreams.length} dreams with URLs to convert to object keys`,
  );

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
    const originalData = {
      video: dream.video,
      original_video: dream.original_video,
      thumbnail: dream.thumbnail,
      filmstrip: dream.filmstrip ? JSON.stringify(dream.filmstrip) : null,
    };

    if (
      dream.video &&
      (dream.video.includes("http://") || dream.video.includes("https://"))
    ) {
      const newObjectKey = extractObjectKey(dream.video);
      if (newObjectKey && newObjectKey !== dream.video) {
        dream.video = newObjectKey;
        stats.migrated.video++;
        hasChanges = true;
      }
    }

    if (
      dream.original_video &&
      (dream.original_video.includes("http://") ||
        dream.original_video.includes("https://"))
    ) {
      const newObjectKey = extractObjectKey(dream.original_video);
      if (newObjectKey && newObjectKey !== dream.original_video) {
        dream.original_video = newObjectKey;
        stats.migrated.originalVideo++;
        hasChanges = true;
      }
    }

    if (
      dream.thumbnail &&
      (dream.thumbnail.includes("http://") ||
        dream.thumbnail.includes("https://"))
    ) {
      const newObjectKey = extractObjectKey(dream.thumbnail);
      if (newObjectKey && newObjectKey !== dream.thumbnail) {
        dream.thumbnail = newObjectKey;
        stats.migrated.thumbnail++;
        hasChanges = true;
      }
    }

    if (dream.filmstrip && Array.isArray(dream.filmstrip)) {
      const originalFilmstrip = JSON.stringify(dream.filmstrip);
      dream.filmstrip = extractFilmstripObjectKeys(dream.filmstrip) as
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
      console.log(`  Video: ${originalData.video} -> ${dream.video}`);
      console.log(
        `  Original Video: ${originalData.original_video} -> ${dream.original_video}`,
      );
      console.log(
        `  Thumbnail: ${originalData.thumbnail} -> ${dream.thumbnail}`,
      );
      if (originalData.filmstrip !== JSON.stringify(dream.filmstrip)) {
        console.log(
          `  Filmstrip: Updated ${
            Array.isArray(dream.filmstrip) ? dream.filmstrip.length : 0
          } items`,
        );
      }
    } else if (hasChanges && dryRun) {
      console.log(`[DRY RUN] Would migrate dream ${dream.uuid}`);
      console.log(`  Video: ${originalData.video} -> ${dream.video}`);
      console.log(
        `  Original Video: ${originalData.original_video} -> ${dream.original_video}`,
      );
      console.log(
        `  Thumbnail: ${originalData.thumbnail} -> ${dream.thumbnail}`,
      );
      if (originalData.filmstrip !== JSON.stringify(dream.filmstrip)) {
        console.log(
          `  Filmstrip: Would update ${
            Array.isArray(dream.filmstrip) ? dream.filmstrip.length : 0
          } items`,
        );
      }
    }
  }

  return stats;
};

const migrateKeyframes = async (
  dryRun: boolean = true,
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
      keyframe.image &&
      (keyframe.image.includes("http://") ||
        keyframe.image.includes("https://")),
  );

  console.log(
    `Found ${keyframesToMigrate.length} keyframes with URLs to convert to object keys`,
  );

  const stats = {
    total: keyframesToMigrate.length,
    migrated: {
      image: 0,
    },
  };

  for (const keyframe of keyframesToMigrate) {
    if (
      keyframe.image &&
      (keyframe.image.includes("http://") ||
        keyframe.image.includes("https://"))
    ) {
      const originalUrl = keyframe.image;
      const newObjectKey = extractObjectKey(keyframe.image);

      if (newObjectKey && newObjectKey !== keyframe.image) {
        keyframe.image = newObjectKey;
        stats.migrated.image++;

        if (!dryRun) {
          await keyframeRepository.save(keyframe);
          console.log(`✓ Migrated keyframe ${keyframe.uuid}`);
          console.log(`  Image: ${originalUrl} -> ${keyframe.image}`);
        } else {
          console.log(`[DRY RUN] Would migrate keyframe ${keyframe.uuid}`);
          console.log(`  Image: ${originalUrl} -> ${keyframe.image}`);
        }
      }
    }
  }

  return stats;
};

const migratePlaylists = async (
  dryRun: boolean = true,
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
      playlist.thumbnail &&
      (playlist.thumbnail.includes("http://") ||
        playlist.thumbnail.includes("https://")),
  );

  console.log(
    `Found ${playlistsToMigrate.length} playlists with URLs to convert to object keys`,
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
      (playlist.thumbnail.includes("http://") ||
        playlist.thumbnail.includes("https://"))
    ) {
      const originalUrl = playlist.thumbnail;
      const newObjectKey = extractObjectKey(playlist.thumbnail);

      if (newObjectKey && newObjectKey !== playlist.thumbnail) {
        playlist.thumbnail = newObjectKey;
        stats.migrated.thumbnail++;

        if (!dryRun) {
          await playlistRepository.save(playlist);
          console.log(`✓ Migrated playlist ${playlist.uuid}`);
          console.log(`  Thumbnail: ${originalUrl} -> ${playlist.thumbnail}`);
        } else {
          console.log(`[DRY RUN] Would migrate playlist ${playlist.uuid}`);
          console.log(`  Thumbnail: ${originalUrl} -> ${playlist.thumbnail}`);
        }
      }
    }
  }

  return stats;
};

const migrateUsers = async (
  dryRun: boolean = true,
): Promise<MigrationStats["users"]> => {
  const userRepository = appDataSource.getRepository(User);

  const users = await userRepository.find({
    where: {
      avatar: Not(IsNull()),
    },
    withDeleted: true,
  });

  const usersToMigrate = users.filter(
    (user) =>
      user.avatar &&
      (user.avatar.includes("http://") || user.avatar.includes("https://")),
  );

  console.log(
    `Found ${usersToMigrate.length} users with avatar URLs to convert to object keys`,
  );

  const stats = {
    total: usersToMigrate.length,
    migrated: {
      avatar: 0,
    },
  };

  for (const user of usersToMigrate) {
    if (
      user.avatar &&
      (user.avatar.includes("http://") || user.avatar.includes("https://"))
    ) {
      const originalUrl = user.avatar;
      const newObjectKey = extractObjectKey(user.avatar);

      if (newObjectKey && newObjectKey !== user.avatar) {
        user.avatar = newObjectKey;
        stats.migrated.avatar++;

        if (!dryRun) {
          await userRepository.save(user);
          console.log(`✓ Migrated user ${user.uuid}`);
          console.log(`  Avatar: ${originalUrl} -> ${user.avatar}`);
        } else {
          console.log(`[DRY RUN] Would migrate user ${user.uuid}`);
          console.log(`  Avatar: ${originalUrl} -> ${user.avatar}`);
        }
      }
    }
  }

  return stats;
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");

  console.log("🚀 Starting URL to Object Key extraction...");
  console.log(`📊 Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log("─".repeat(50));

  try {
    // Initialize the data source
    await appDataSource.initialize();
    console.log("✅ Database connection established");

    // Perform migrations
    console.log("\n🎬 Extracting object keys from Dream URLs...");
    const dreamStats = await migrateDreams(dryRun);

    console.log("\n🖼️  Extracting object keys from Keyframe URLs...");
    const keyframeStats = await migrateKeyframes(dryRun);

    console.log("\n📋 Extracting object keys from Playlist URLs...");
    const playlistStats = await migratePlaylists(dryRun);

    console.log("\n👤 Extracting object keys from User avatar URLs...");
    const userStats = await migrateUsers(dryRun);

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

    console.log(`\n✨ Total URLs converted to object keys: ${totalMigrated}`);

    if (dryRun) {
      console.log(
        "\n⚠️  This was a DRY RUN. No changes were made to the database.",
      );
      console.log("To execute the migration, run:");
      console.log("npm run extract-object-keys -- --execute");
    } else {
      console.log("\n✅ Object key extraction completed successfully!");
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
