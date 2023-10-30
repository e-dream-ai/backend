import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamAddSoftDelete1698443613437 implements MigrationInterface {
  name = "DreamAddSoftDelete1698443613437";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" ADD "deleted_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "deleted_at"`);
  }
}
