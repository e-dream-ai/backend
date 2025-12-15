import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessedMediaResolutionToDream1766000000000
implements MigrationInterface
{
  name = "AddProcessedMediaResolutionToDream1766000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "processedMediaWidth" integer`,
    );
    await queryRunner.query(`ALTER TABLE "dream" ADD "  " integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedMediaHeight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "processedMediaWidth"`,
    );
  }
}
