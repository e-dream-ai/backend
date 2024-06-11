import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessedAtToDream1718062253450 implements MigrationInterface {
  name = "AddProcessedAtToDream1718062253450";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" ADD "processed_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "processed_at"`);
  }
}
