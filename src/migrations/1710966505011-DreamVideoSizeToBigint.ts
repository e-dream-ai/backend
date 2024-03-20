import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamVideoSizeToBigint1710966505011 implements MigrationInterface {
  name = "DreamVideoSizeToBigint1710966505011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoSize" bigint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedVideoSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedVideoSize" integer`,
    );
  }
}
