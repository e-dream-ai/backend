import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamAddActivityLevel1704222572799 implements MigrationInterface {
  name = "DreamAddActivityLevel1704222572799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "activityLevel" numeric NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "activityLevel"`);
  }
}
