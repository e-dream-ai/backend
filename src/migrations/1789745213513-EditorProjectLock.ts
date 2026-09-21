import { MigrationInterface, QueryRunner } from "typeorm";

export class EditorProjectLock1789745213513 implements MigrationInterface {
  name = "EditorProjectLock1789745213513";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD "lockedBy" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" ADD "lockedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP COLUMN "lockedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "editor_project" DROP COLUMN "lockedBy"`,
    );
  }
}
