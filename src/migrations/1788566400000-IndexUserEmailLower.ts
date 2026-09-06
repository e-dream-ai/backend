import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexUserEmailLower1788566400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_USER_EMAIL_LOWER" ON "user" (LOWER("email"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_USER_EMAIL_LOWER"`);
  }
}
