import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1793299077000 implements MigrationInterface {
  name = "Migrations1793299077000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" ADD "transitionTime" real`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" DROP COLUMN "transitionTime"`,
    );
  }
}
