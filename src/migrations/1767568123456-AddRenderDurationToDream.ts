import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRenderDurationToDream1767568123456
implements MigrationInterface
{
  name = "AddRenderDurationToDream1767568123456";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "render_duration" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "render_duration"`,
    );
  }
}
