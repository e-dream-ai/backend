import "reflect-metadata";
import appDataSource from "database/app-data-source";
import {
  ApiKey,
  DefaultPlaylist,
  Dream,
  FeedItem,
  Keyframe,
  Playlist,
  User,
} from "entities";
import {
  EntityTarget,
  QueryRunner,
  Repository,
  FindOptionsWhere,
} from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { Vote } from "entities";

type TransferOptions = {
  dryRun: boolean;
  withDeleted: boolean;
  includeApiKeys: boolean;
  includeVotes: boolean;
  transferCurrents: boolean;
};

type TransferStats = Record<string, number>;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fromUuid = args.find((arg) => arg.startsWith("--from="))?.split("=")[1];
  const toUuid = args.find((arg) => arg.startsWith("--to="))?.split("=")[1];

  const dryRun = !args.includes("--execute");
  const withDeleted = args.includes("--with-deleted");
  const includeApiKeys = args.includes("--include-api-keys");
  const includeVotes = args.includes("--include-votes");
  const transferCurrents = args.includes("--transfer-currents");

  if (!fromUuid || !toUuid) {
    console.error(
      "Usage: pnpm run script -- script/transfer-ownership.ts --from=<uuid> --to=<uuid> [--execute] [--with-deleted] [--include-api-keys] [--include-votes] [--transfer-currents]",
    );
    process.exit(1);
  }

  return {
    fromUuid,
    toUuid,
    dryRun,
    withDeleted,
    includeApiKeys,
    includeVotes,
    transferCurrents,
  };
};

async function findUserByUuid(
  repo: Repository<User>,
  uuid: string,
): Promise<User> {
  const user = await repo.findOne({ where: { uuid } });
  if (!user) {
    throw new Error(`User not found for uuid: ${uuid}`);
  }
  return user;
}

async function transferRelation<
  T extends { id: number },
  K extends keyof T,
>(params: {
  manager: QueryRunner["manager"];
  entity: EntityTarget<T>;
  label: string;
  fieldName: K;
  fromUserId: number;
  toUser: User;
  options: TransferOptions;
}): Promise<number> {
  const { manager, entity, label, fieldName, fromUserId, toUser, options } =
    params;

  const repo = manager.getRepository<T>(entity);

  const where = {
    [fieldName]: { id: fromUserId },
  } as unknown as FindOptionsWhere<T>;
  const records = await repo.find({ where, withDeleted: options.withDeleted });

  if (records.length === 0) {
    return 0;
  }

  let updated = 0;
  for (const record of records) {
    const updateData = {
      [fieldName]: toUser,
    } as unknown as QueryDeepPartialEntity<T>;
    if (options.dryRun) {
      updated++;
    } else {
      await repo.update(record.id, updateData);
      updated++;
    }
  }

  console.log(
    `${
      options.dryRun ? "[DRY RUN] Would update" : "Updated"
    } ${updated} ${label}`,
  );
  return updated;
}

async function main() {
  const {
    fromUuid,
    toUuid,
    dryRun,
    withDeleted,
    includeApiKeys,
    includeVotes,
    transferCurrents,
  } = parseArgs();

  console.log("🚀 Starting ownership transfer...");
  console.log(`From: ${fromUuid}`);
  console.log(`To:   ${toUuid}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(
    `Flags: withDeleted=${withDeleted}, includeApiKeys=${includeApiKeys}, includeVotes=${includeVotes}, transferCurrents=${transferCurrents}`,
  );

  await appDataSource.initialize();

  const userRepo = appDataSource.getRepository(User);
  const fromUser = await findUserByUuid(userRepo, fromUuid);
  const toUser = await findUserByUuid(userRepo, toUuid);

  if (fromUser.id === toUser.id) {
    console.log("Nothing to do: source and target users are the same.");
    await appDataSource.destroy();
    process.exit(0);
  }

  const queryRunner: QueryRunner = appDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  const stats: TransferStats = {};

  try {
    const options: TransferOptions = {
      dryRun,
      withDeleted,
      includeApiKeys,
      includeVotes,
      transferCurrents,
    };

    // Core content ownership
    stats["dream.user"] = await transferRelation<Dream, "user">({
      manager: queryRunner.manager,
      entity: Dream,
      label: "Dream.user records",
      fieldName: "user",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["dream.displayedOwner"] = await transferRelation<
      Dream,
      "displayedOwner"
    >({
      manager: queryRunner.manager,
      entity: Dream,
      label: "Dream.displayedOwner records",
      fieldName: "displayedOwner",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["playlist.user"] = await transferRelation<Playlist, "user">({
      manager: queryRunner.manager,
      entity: Playlist,
      label: "Playlist.user records",
      fieldName: "user",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["playlist.displayedOwner"] = await transferRelation<
      Playlist,
      "displayedOwner"
    >({
      manager: queryRunner.manager,
      entity: Playlist,
      label: "Playlist.displayedOwner records",
      fieldName: "displayedOwner",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["keyframe.user"] = await transferRelation<Keyframe, "user">({
      manager: queryRunner.manager,
      entity: Keyframe,
      label: "Keyframe.user records",
      fieldName: "user",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["keyframe.displayedOwner"] = await transferRelation<
      Keyframe,
      "displayedOwner"
    >({
      manager: queryRunner.manager,
      entity: Keyframe,
      label: "Keyframe.displayedOwner records",
      fieldName: "displayedOwner",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["feedItem.user"] = await transferRelation<FeedItem, "user">({
      manager: queryRunner.manager,
      entity: FeedItem,
      label: "FeedItem.user records",
      fieldName: "user",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    stats["defaultPlaylist.user"] = await transferRelation<
      DefaultPlaylist,
      "user"
    >({
      manager: queryRunner.manager,
      entity: DefaultPlaylist,
      label: "DefaultPlaylist.user records",
      fieldName: "user",
      fromUserId: fromUser.id,
      toUser,
      options,
    });

    if (includeApiKeys) {
      stats["apiKey.user"] = await transferRelation<ApiKey, "user">({
        manager: queryRunner.manager,
        entity: ApiKey,
        label: "ApiKey.user records",
        fieldName: "user",
        fromUserId: fromUser.id,
        toUser,
        options,
      });
    }

    if (includeVotes) {
      stats["vote.user"] = await transferRelation<Vote, "user">({
        manager: queryRunner.manager,
        entity: Vote,
        label: "Vote.user records",
        fieldName: "user",
        fromUserId: fromUser.id,
        toUser,
        options,
      });
    }

    if (transferCurrents) {
      const freshFromUser = await queryRunner.manager
        .getRepository(User)
        .findOne({
          where: { id: fromUser.id },
          relations: {
            currentDream: true,
            currentPlaylist: true,
          },
        });

      const freshToUser = await queryRunner.manager
        .getRepository(User)
        .findOne({
          where: { id: toUser.id },
          relations: {
            currentDream: true,
            currentPlaylist: true,
          },
        });

      if (freshFromUser && freshToUser) {
        const updates: Partial<User> = {};
        const clearFrom: Partial<User> = {};

        if (freshFromUser.currentDream && !freshToUser.currentDream) {
          updates.currentDream = freshFromUser.currentDream;
          clearFrom.currentDream = null as unknown as User["currentDream"];
        }
        if (freshFromUser.currentPlaylist && !freshToUser.currentPlaylist) {
          updates.currentPlaylist = freshFromUser.currentPlaylist;
          clearFrom.currentPlaylist =
            null as unknown as User["currentPlaylist"];
        }

        if (Object.keys(updates).length > 0) {
          if (!dryRun) {
            await queryRunner.manager
              .getRepository(User)
              .update(freshToUser.id, updates);
            await queryRunner.manager
              .getRepository(User)
              .update(freshFromUser.id, clearFrom);
          }
          console.log(
            `${
              dryRun ? "[DRY RUN] Would transfer" : "Transferred"
            } current pointers: ${Object.keys(updates).join(", ")}`,
          );
        }
      }
    }

    if (dryRun) {
      await queryRunner.rollbackTransaction();
    } else {
      await queryRunner.commitTransaction();
    }

    console.log("\n" + "=".repeat(50));
    console.log("Ownership Transfer Summary");
    console.log("=".repeat(50));
    Object.entries(stats).forEach(([k, v]) => console.log(`${k}: ${v}`));
    console.log("\nDone.");
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("❌ Transfer failed:", error);
    process.exitCode = 1;
  } finally {
    await queryRunner.release();
    await appDataSource.destroy();
  }
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
