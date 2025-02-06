import { MigrationInterface, QueryRunner } from "typeorm";

export class Keyframe1738799956563 implements MigrationInterface {
  name = "Keyframe1738799956563";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "keyframe" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "image" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "userId" integer, "displayedOwnerId" integer, CONSTRAINT "PK_2269f111ef6816a58ca5a219415" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa533479ff4601dbefbb41b9f7" ON "keyframe" ("uuid") `,
    );
    await queryRunner.query(
      `CREATE TABLE "playlist_keyframe" ("id" SERIAL NOT NULL, "order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "playlistId" integer, "keyframeId" integer, CONSTRAINT "PK_cf9ff70cf6c28cb628e76181b72" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "startKeyframeId" integer`,
    );
    await queryRunner.query(`ALTER TABLE "dream" ADD "endKeyframeId" integer`);
    await queryRunner.query(
      `ALTER TABLE "keyframe" ADD CONSTRAINT "FK_1cc58ed5deeddcee038adbae436" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "keyframe" ADD CONSTRAINT "FK_c91caefd5728a120d1b723ac526" FOREIGN KEY ("displayedOwnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_keyframe" ADD CONSTRAINT "FK_5f243c7b78401c7dc91d72773ab" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_keyframe" ADD CONSTRAINT "FK_3b5c8b60015ad3a0b04bfaf9e68" FOREIGN KEY ("keyframeId") REFERENCES "keyframe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD CONSTRAINT "FK_214193ff78042aa8d3f6e69eb0d" FOREIGN KEY ("startKeyframeId") REFERENCES "keyframe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD CONSTRAINT "FK_5bc5bf4c9bdb12629906568f72c" FOREIGN KEY ("endKeyframeId") REFERENCES "keyframe"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP CONSTRAINT "FK_5bc5bf4c9bdb12629906568f72c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" DROP CONSTRAINT "FK_214193ff78042aa8d3f6e69eb0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_keyframe" DROP CONSTRAINT "FK_3b5c8b60015ad3a0b04bfaf9e68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlist_keyframe" DROP CONSTRAINT "FK_5f243c7b78401c7dc91d72773ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keyframe" DROP CONSTRAINT "FK_c91caefd5728a120d1b723ac526"`,
    );
    await queryRunner.query(
      `ALTER TABLE "keyframe" DROP CONSTRAINT "FK_1cc58ed5deeddcee038adbae436"`,
    );
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "endKeyframeId"`);
    await queryRunner.query(
      `ALTER TABLE "dream" DROP COLUMN "startKeyframeId"`,
    );
    await queryRunner.query(`DROP TABLE "playlist_keyframe"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa533479ff4601dbefbb41b9f7"`,
    );
    await queryRunner.query(`DROP TABLE "keyframe"`);
  }
}
