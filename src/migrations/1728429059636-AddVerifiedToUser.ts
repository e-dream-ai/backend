import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerifiedToUser1728429059636 implements MigrationInterface {
  name = "AddVerifiedToUser1728429059636";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "verified" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "verified"`);
  }
}
