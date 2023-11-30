import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAddFields1701300107732 implements MigrationInterface {
  name = "UserAddFields1701300107732";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "name" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "description" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "avatar" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "name"`);
  }
}
