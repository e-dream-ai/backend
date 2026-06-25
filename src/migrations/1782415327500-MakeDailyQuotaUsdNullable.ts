import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeDailyQuotaUsdNullable1782415327500
implements MigrationInterface
{
  name = "MakeDailyQuotaUsdNullable1782415327500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "dailyQuotaUsd" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user" SET "dailyQuotaUsd" = '10' WHERE "dailyQuotaUsd" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "dailyQuotaUsd" SET NOT NULL`,
    );
  }
}
