import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsToDream1731017397405 implements MigrationInterface {
  name = "AddFieldsToDream1731017397405";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "ccbyLicense" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "sourceUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "sourceUrl"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "ccbyLicense"`);
  }
}
