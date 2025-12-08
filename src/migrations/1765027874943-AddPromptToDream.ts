import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromptToDream1765027874943 implements MigrationInterface {
  name = "AddPromptToDream1765027874943";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" ADD "prompt" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "prompt"`);
  }
}
