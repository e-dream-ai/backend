import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastLoginToUser1718145932929 implements MigrationInterface {
  name = "AddLastLoginToUser1718145932929";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "last_login_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "last_login_at"`);
  }
}
