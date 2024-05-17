import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToVotes1715815351439 implements MigrationInterface {
  name = "AddSoftDeleteToVotes1715815351439";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vote" ADD "deleted_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_f5de237a438d298031d11a57c3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "REL_f5de237a438d298031d11a57c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "FK_f5de237a438d298031d11a57c3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_f5de237a438d298031d11a57c3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "REL_f5de237a438d298031d11a57c3" UNIQUE ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "FK_f5de237a438d298031d11a57c3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "vote" DROP COLUMN "deleted_at"`);
  }
}
