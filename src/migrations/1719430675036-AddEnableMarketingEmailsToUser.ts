import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnableMarketingEmailsToUser1719430675036
implements MigrationInterface
{
  name = "AddEnableMarketingEmailsToUser1719430675036";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "enableMarketingEmails" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "enableMarketingEmails"`,
    );
  }
}
