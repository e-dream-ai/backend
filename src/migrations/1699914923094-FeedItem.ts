import { MigrationInterface, QueryRunner } from "typeorm";

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
