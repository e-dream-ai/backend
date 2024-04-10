import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDisplayedOwnerToDreamAndPlaylist1712775593477
implements MigrationInterface
{
  name = "AddDisplayedOwnerToDreamAndPlaylist1712775593477";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD "displayedOwnerId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "displayedOwnerId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD CONSTRAINT "FK_1c64ab14fba57ece9b129b8c047" FOREIGN KEY ("displayedOwnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD CONSTRAINT "FK_97865d6a6cb5686980d90980291" FOREIGN KEY ("displayedOwnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP CONSTRAINT "FK_97865d6a6cb5686980d90980291"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist" DROP CONSTRAINT "FK_1c64ab14fba57ece9b129b8c047"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "displayedOwnerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist" DROP COLUMN "displayedOwnerId"`,
    );
  }
}
