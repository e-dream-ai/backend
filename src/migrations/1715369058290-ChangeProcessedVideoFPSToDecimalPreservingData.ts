import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeProcessedVideoFPSToDecimalPreservingData1715369058290
implements MigrationInterface
{
  name = "ChangeProcessedVideoFPSToDecimalPreservingData1715369058290";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "processedVideoFPS" type numeric`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ALTER COLUMN "processedVideoFPS" type integer`,
    );
  }
}
