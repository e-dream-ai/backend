import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNsfwFlags1713386245934 implements MigrationInterface {
  name = "AddNsfwFlags1713386245934";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "nsfw" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "nsfw" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "nsfw"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "nsfw"`);
  }
}
