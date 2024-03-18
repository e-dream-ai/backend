import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCurrentPlay1710787913634 implements MigrationInterface {
  name = "FixCurrentPlay1710787913634";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_333bf71689c53770c7441a21428"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_7f0635d1eb4acca2d6493b204dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_333bf71689c53770c7441a21428"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_7f0635d1eb4acca2d6493b204dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_333bf71689c53770c7441a21428" FOREIGN KEY ("currentDreamId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_7f0635d1eb4acca2d6493b204dd" FOREIGN KEY ("currentPlaylistId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_7f0635d1eb4acca2d6493b204dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_333bf71689c53770c7441a21428"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_7f0635d1eb4acca2d6493b204dd" UNIQUE ("currentPlaylistId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_333bf71689c53770c7441a21428" UNIQUE ("currentDreamId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_7f0635d1eb4acca2d6493b204dd" FOREIGN KEY ("currentPlaylistId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_333bf71689c53770c7441a21428" FOREIGN KEY ("currentDreamId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
