import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkOSIdToUser1726084271049 implements MigrationInterface {
  name = "AddWorkOSIdToUser1726084271049";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "workOSId" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "lastName" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1c34be2c97da38c29f6218a1f" ON "user" ("workOSId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1c34be2c97da38c29f6218a1f"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "workOSId"`);
  }
}
