import { MigrationInterface, QueryRunner } from "typeorm";

export class PlaylistDescription1756048243929 implements MigrationInterface {
  name = "PlaylistDescription1756048243929";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" ADD "description" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "description"`);
  }
}
