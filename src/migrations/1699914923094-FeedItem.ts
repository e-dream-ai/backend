import { Dream, Playlist } from "entities";
import { FeedItem } from "entities/FeedItem.entity";
import { MigrationInterface, QueryRunner } from "typeorm";
import { FeedItemType } from "types/feed-item.types";

export class FeedItem1699914923094 implements MigrationInterface {
  name = "FeedItem1699914923094";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."feed_item_type_enum" AS ENUM('playlist', 'dream', 'none')`,
    );

    await queryRunner.query(
      `CREATE TABLE "feed_item" ("id" SERIAL NOT NULL, "type" "public"."feed_item_type_enum" NOT NULL DEFAULT 'none', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "userId" integer, "dreamItemId" integer, "playlistItemId" integer, CONSTRAINT "REL_693aa2962735374f7e85fadd44" UNIQUE ("dreamItemId"), CONSTRAINT "REL_c5cb5e21337c664a3b37214676" UNIQUE ("playlistItemId"), CONSTRAINT "PK_15e831e9beea6ca204556c64438" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_item" ADD CONSTRAINT "FK_4b25fd89ec49566db04d95da602" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_item" ADD CONSTRAINT "FK_693aa2962735374f7e85fadd444" FOREIGN KEY ("dreamItemId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_item" ADD CONSTRAINT "FK_c5cb5e21337c664a3b37214676a" FOREIGN KEY ("playlistItemId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    const dreams = await queryRunner.manager.find(Dream, {
      withDeleted: true,
      relations: { user: true },
    });

    for (let i = 0; i < dreams.length; i++) {
      const dream = dreams[i];
      await await queryRunner.manager.save(
        queryRunner.manager.create<FeedItem>(FeedItem, {
          user: dream.user,
          dreamItem: dream,
          type: FeedItemType.DREAM,
          created_at: dream.created_at,
          updated_at: dream.updated_at,
          deleted_at: dream.deleted_at,
        }),
      );
    }

    const playlists = await queryRunner.manager.find(Playlist, {
      withDeleted: true,
      relations: { user: true },
    });

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      await queryRunner.manager.save(
        queryRunner.manager.create<FeedItem>(FeedItem, {
          user: playlist.user,
          playlistItem: playlist,
          type: FeedItemType.PLAYLIST,
          created_at: playlist.created_at,
          updated_at: playlist.updated_at,
          deleted_at: playlist.deleted_at,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feed_item" DROP CONSTRAINT "FK_c5cb5e21337c664a3b37214676a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_item" DROP CONSTRAINT "FK_693aa2962735374f7e85fadd444"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_item" DROP CONSTRAINT "FK_4b25fd89ec49566db04d95da602"`,
    );
    await queryRunner.query(`DROP TABLE "feed_item"`);
    await queryRunner.query(`DROP TYPE "public"."feed_item_type_enum"`);
  }
}
