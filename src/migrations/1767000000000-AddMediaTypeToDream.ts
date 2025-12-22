import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaTypeToDream1767000000000 implements MigrationInterface {
  name = "AddMediaTypeToDream1767000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."dream_media_type_enum" AS ENUM('video', 'image')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "mediaType" "public"."dream_media_type_enum" NOT NULL DEFAULT 'video'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dream_mediaType" ON "dream" ("mediaType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_dream_mediaType"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "mediaType"`);
    await queryRunner.query(`DROP TYPE "public"."dream_media_type_enum"`);
  }
}
