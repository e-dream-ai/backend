import { MigrationInterface, QueryRunner } from "typeorm";

export class EditorProjectArchive1791923405874 implements MigrationInterface {
  name = "EditorProjectArchive1791923405874";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD "archivedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP COLUMN "archivedAt"`,
    );
  }
}
