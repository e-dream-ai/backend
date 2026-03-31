import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMd5ToDream1731361547167 implements MigrationInterface {
  name = "AddMd5ToDream1731361547167";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "md5" character varying(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "md5"`);
  }
}
