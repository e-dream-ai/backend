import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeProcessedVideoFPSToDecimal1715296671635
implements MigrationInterface
{
  name = "ChangeProcessedVideoFPSToDecimal1715296671635";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoFPS"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoFPS" numeric`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoFPS"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoFPS" integer`,
    );
  }
}
