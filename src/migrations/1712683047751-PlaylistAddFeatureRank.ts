import { MigrationInterface, QueryRunner } from "typeorm";

export class PlaylistAddFeatureRank1712683047751 implements MigrationInterface {
  name = "PlaylistAddFeatureRank1712683047751";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "featureRank" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "playlist" DROP COLUMN "featureRank"`);
  }
}
