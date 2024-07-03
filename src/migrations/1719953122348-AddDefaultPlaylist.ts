import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDefaultPlaylist1719953122348 implements MigrationInterface {
  name = "AddDefaultPlaylist1719953122348";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "default_playlist" ("id" SERIAL NOT NULL, "data" json NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "userId" integer, CONSTRAINT "PK_bcd155818f0b2f5f9d243810160" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_playlist" ADD CONSTRAINT "FK_8dfd89398d5dc41d2f9f9d19c20" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "default_playlist" DROP CONSTRAINT "FK_8dfd89398d5dc41d2f9f9d19c20"`,
    );
    await queryRunner.query(`DROP TABLE "default_playlist"`);
  }
}
