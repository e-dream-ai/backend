import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNsfwFlagToPlaylist1713996486123 implements MigrationInterface {
  name = "AddNsfwFlagToPlaylist1713996486123";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "nsfw" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "nsfw"`);
  }
}
