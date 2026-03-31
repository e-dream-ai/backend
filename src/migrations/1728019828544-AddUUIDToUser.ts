import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUUIDToUser1728019828544 implements MigrationInterface {
  name = "AddUUIDToUser1728019828544";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "uuid" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a95e949168be7b7ece1a2382fe" ON "user" ("uuid") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a95e949168be7b7ece1a2382fe"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "uuid"`);
  }
}
