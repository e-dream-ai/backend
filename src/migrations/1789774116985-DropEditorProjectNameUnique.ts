import { MigrationInterface, QueryRunner } from "typeorm";

export class DropEditorProjectNameUnique1789774116985
implements MigrationInterface
{
  name = "DropEditorProjectNameUnique1789774116985";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_EDITOR_PROJECT_USER_EDITOR_NAME"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_EDITOR_PROJECT_USER_EDITOR_NAME" ON "editor_project" ("userId", "editorId", "name") WHERE "deleted_at" IS NULL`,
    );
  }
}
