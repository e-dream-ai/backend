import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedAndMoreIndexes1740771545271 implements MigrationInterface {
  name = "AddFeedAndMoreIndexes1740771545271";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_4b25fd89ec49566db04d95da60" ON "feed_item" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34ba886df71aeea293fb7d91bd" ON "feed_item" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_693aa2962735374f7e85fadd44" ON "feed_item" ("dreamItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c5cb5e21337c664a3b37214676" ON "feed_item" ("playlistItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_277972f4944205eb29127f9bb6" ON "api_key" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8dfd89398d5dc41d2f9f9d19c2" ON "default_playlist" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8dfd89398d5dc41d2f9f9d19c2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_277972f4944205eb29127f9bb6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c5cb5e21337c664a3b37214676"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_693aa2962735374f7e85fadd44"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_34ba886df71aeea293fb7d91bd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b25fd89ec49566db04d95da60"`,
    );
  }
}
