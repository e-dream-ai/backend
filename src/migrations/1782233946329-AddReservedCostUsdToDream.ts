import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservedCostUsdToDream1782233946329
implements MigrationInterface
{
  name = "AddReservedCostUsdToDream1782233946329";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "reservedCostUsd" numeric(10,4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "reservedCostUsd"`,
    );
  }
}
