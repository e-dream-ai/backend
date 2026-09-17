import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEditorProject1789328254438 implements MigrationInterface {
  name = "AddEditorProject1789328254438";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "editor_project" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer, "playlistId" integer, "editorId" character varying(64) NOT NULL, "name" character varying(120) NOT NULL, "state" jsonb NOT NULL, "revision" integer NOT NULL DEFAULT '1', "schemaVersion" integer NOT NULL DEFAULT '1', "thumbnail" character varying(2048), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_062da3d3649d37eff493fa06e1f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e9d62273ebb488d2dcaf62730" ON "editor_project" ("uuid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad6d9f595b666da5b240af5600" ON "editor_project" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4ab8bb5aec0541f93a8dcd5e64" ON "editor_project" ("playlistId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56ca7f117effad7dda386e8912" ON "editor_project" ("userId", "editorId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD CONSTRAINT "FK_ad6d9f595b666da5b240af56007" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD CONSTRAINT "FK_4ab8bb5aec0541f93a8dcd5e64f" FOREIGN KEY ("playlistId") REFERENCES "playlist"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_EDITOR_PROJECT_USER_EDITOR_NAME" ON "editor_project" ("userId", "editorId", "name") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_EDITOR_PROJECT_USER_EDITOR_NAME"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP CONSTRAINT "FK_4ab8bb5aec0541f93a8dcd5e64f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP CONSTRAINT "FK_ad6d9f595b666da5b240af56007"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56ca7f117effad7dda386e8912"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4ab8bb5aec0541f93a8dcd5e64"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad6d9f595b666da5b240af5600"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e9d62273ebb488d2dcaf62730"`,
    );
    await queryRunner.query(`DROP TABLE "editor_project"`);
  }
}
