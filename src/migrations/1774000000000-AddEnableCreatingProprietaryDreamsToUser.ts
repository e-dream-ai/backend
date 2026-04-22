import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnableCreatingProprietaryDreamsToUser1774000000000
implements MigrationInterface
{
  name = "AddEnableCreatingProprietaryDreamsToUser1774000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "enableCreatingProprietaryDreams" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "enableCreatingProprietaryDreams"`,
    );
  }
}
