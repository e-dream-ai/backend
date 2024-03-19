import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessedVideoInfo1710885136510 implements MigrationInterface {
  name = "AddProcessedVideoInfo1710885136510";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoSize" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoFrames" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoFrames"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoSize"`,
    );
  }
}
