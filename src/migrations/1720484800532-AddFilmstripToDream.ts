import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFilmstripToDream1720484800532 implements MigrationInterface {
  name = "AddFilmstripToDream1720484800532";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" ADD "filmstrip" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "filmstrip"`);
  }
}
