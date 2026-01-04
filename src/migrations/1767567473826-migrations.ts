import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1767567473826 implements MigrationInterface {
  name = "Migrations1767567473826";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_dream_mediaType"`);
    await queryRunner.query(`ALTER TABLE "dream" ADD "error" text`);
    await queryRunner.query(
      `ALTER TYPE "public"."dream_media_type_enum" RENAME TO "dream_media_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dream_mediatype_enum" AS ENUM('video', 'image')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" TYPE "public"."dream_mediatype_enum" USING "mediaType"::"text"::"public"."dream_mediatype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" SET DEFAULT 'video'`,
    );
    await queryRunner.query(`DROP TYPE "public"."dream_media_type_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_9b4e1597e62521e68447e53364" ON "dream" ("mediaType") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b4e1597e62521e68447e53364"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dream_media_type_enum_old" AS ENUM('video', 'image')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" TYPE "public"."dream_media_type_enum_old" USING "mediaType"::"text"::"public"."dream_media_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "mediaType" SET DEFAULT 'video'`,
    );
    await queryRunner.query(`DROP TYPE "public"."dream_mediatype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."dream_media_type_enum_old" RENAME TO "dream_media_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "error"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_dream_mediaType" ON "dream" ("mediaType") `,
    );
  }
}
