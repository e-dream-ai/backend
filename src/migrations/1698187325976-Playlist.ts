import { MigrationInterface, QueryRunner } from "typeorm";

export class Playlist1698187325976 implements MigrationInterface {
  name = "Playlist1698187325976";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."playlist_item_type_enum" AS ENUM('none', 'playlist', 'dream')`,
    );
    await queryRunner.query(
      `CREATE TABLE "playlist_item" ("id" SERIAL NOT NULL, "type" "public"."playlist_item_type_enum" NOT NULL DEFAULT 'none', "order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "playlistId" integer, "dreamItemId" integer, "playlistItemId" integer, CONSTRAINT "PK_958bd2e5a3e9728df21b5855dc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "playlist" ("id" SERIAL NOT NULL, "name" character varying, "thumbnail" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "userId" integer, CONSTRAINT "PK_538c2893e2024fabc7ae65ad142" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "playlist_item" ADD CONSTRAINT "FK_9b9b229772d88966e7d9959d907" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_item" ADD CONSTRAINT "FK_f72102e7ac109f47b916c369458" FOREIGN KEY ("dreamItemId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_item" ADD CONSTRAINT "FK_6dc588a3e0b75d0e34e60506f66" FOREIGN KEY ("playlistItemId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist" ADD CONSTRAINT "FK_92ca9b9b5394093adb6e5f55c4b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "playlist" DROP CONSTRAINT "FK_92ca9b9b5394093adb6e5f55c4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_item" DROP CONSTRAINT "FK_6dc588a3e0b75d0e34e60506f66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_item" DROP CONSTRAINT "FK_f72102e7ac109f47b916c369458"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_item" DROP CONSTRAINT "FK_9b9b229772d88966e7d9959d907"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "created_at"`);
    await queryRunner.query(`DROP TABLE "playlist"`);
    await queryRunner.query(`DROP TABLE "playlist_item"`);
    await queryRunner.query(`DROP TYPE "public"."playlist_item_type_enum"`);
  }
}
