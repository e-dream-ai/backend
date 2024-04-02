import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamAddProcessedVideoFPS1712099961487
implements MigrationInterface
{
  name = "DreamAddProcessedVideoFPS1712099961487";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoFPS" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoFPS"`,
    );
  }
}
