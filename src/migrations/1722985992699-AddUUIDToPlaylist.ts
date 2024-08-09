import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUUIDToPlaylist1722985992699 implements MigrationInterface {
  name = "AddUUIDToPlaylist1722985992699";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "uuid" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8bb001fb09d88792e2a2b8562" ON "playlist" ("uuid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb58bdd0b172c550575bb4d9b1" ON "dream" ("uuid") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb58bdd0b172c550575bb4d9b1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8bb001fb09d88792e2a2b8562"`,
    );
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "uuid"`);
  }
}
