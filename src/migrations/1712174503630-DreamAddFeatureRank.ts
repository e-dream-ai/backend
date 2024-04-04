import { MigrationInterface, QueryRunner } from "typeorm";

export class DreamAddFeatureRank1712174503630 implements MigrationInterface {
  name = "DreamAddFeatureRank1712174503630";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "featureRank" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "featureRank"`);
  }
}
