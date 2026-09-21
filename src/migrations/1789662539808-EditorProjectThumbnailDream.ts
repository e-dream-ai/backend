import { MigrationInterface, QueryRunner } from "typeorm";

export class EditorProjectThumbnailDream1789662539808
implements MigrationInterface
{
  name = "EditorProjectThumbnailDream1789662539808";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP COLUMN "thumbnail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD "thumbnailDreamId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84e2dd3d1149c55d284dea55fd" ON "editor_project" ("thumbnailDreamId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD CONSTRAINT "FK_84e2dd3d1149c55d284dea55fd4" FOREIGN KEY ("thumbnailDreamId") REFERENCES "dream"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP CONSTRAINT "FK_84e2dd3d1149c55d284dea55fd4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84e2dd3d1149c55d284dea55fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP COLUMN "thumbnailDreamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD "thumbnail" character varying(2048)`,
    );
  }
}
