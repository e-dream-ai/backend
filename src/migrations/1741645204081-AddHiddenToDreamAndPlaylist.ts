import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHiddenToDreamAndPlaylist1741645204081
implements MigrationInterface
{
  name = "AddHiddenToDreamAndPlaylist1741645204081";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "hidden" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "hidden" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "hidden"`);
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "hidden"`);
  }
}
