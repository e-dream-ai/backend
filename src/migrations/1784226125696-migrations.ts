import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1784226125696 implements MigrationInterface {
  name = "Migrations1784226125696";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" ADD "prompt" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "prompt"`);
  }
}
