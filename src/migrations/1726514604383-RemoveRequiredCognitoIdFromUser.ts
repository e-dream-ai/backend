import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRequiredCognitoIdFromUser1726514604383
implements MigrationInterface
{
  name = "RemoveRequiredCognitoIdFromUser1726514604383";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "cognitoId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "cognitoId" SET NOT NULL`,
    );
  }
}
