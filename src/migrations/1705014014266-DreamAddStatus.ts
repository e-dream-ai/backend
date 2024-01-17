import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamAddStatus1705014014266 implements MigrationInterface {
  name = "DreamAddStatus1705014014266";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."dream_status_enum" AS ENUM('none', 'queue', 'processing', 'failed', 'processed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "status" "public"."dream_status_enum" NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "original_video" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "original_video"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."dream_status_enum"`);
  }
}
