import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastClientPingToUser1724695748952
implements MigrationInterface
{
  name = "AddLastClientPingToUser1724695748952";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "last_client_ping_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "last_client_ping_at"`,
    );
  }
}
