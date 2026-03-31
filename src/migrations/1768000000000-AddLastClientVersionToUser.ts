import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastClientVersionToUser1768000000000
implements MigrationInterface
{
  name = "AddLastClientVersionToUser1768000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "last_client_version" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "last_client_version"`,
    );
  }
}
