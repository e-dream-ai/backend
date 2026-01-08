import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJobTrackingToDream1767888000000 implements MigrationInterface {
  name = "AddJobTrackingToDream1767888000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" ADD "lastJobId" varchar`);
    await queryRunner.query(`ALTER TABLE "dream" ADD "lastQueueName" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "lastQueueName"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "lastJobId"`);
  }
}
