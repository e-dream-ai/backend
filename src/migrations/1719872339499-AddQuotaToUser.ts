import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuotaToUser1719872339499 implements MigrationInterface {
  name = "AddQuotaToUser1719872339499";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "quota" bigint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "quota"`);
  }
}
