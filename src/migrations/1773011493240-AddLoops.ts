import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1773011493240 implements MigrationInterface {
  name = "Migrations1773011493240";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "loops" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "loops"`);
  }
}
