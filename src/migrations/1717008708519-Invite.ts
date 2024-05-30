import { MigrationInterface, QueryRunner } from "typeorm";

export class Invite1717008708519 implements MigrationInterface {
  name = "Invite1717008708519";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "invite" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "size" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_fc9fa190e5a3c5d80604a4f63e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "signupInviteId" integer`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_945dcbc856533582ddaddfb03f8" FOREIGN KEY ("signupInviteId") REFERENCES "invite"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_945dcbc856533582ddaddfb03f8"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "signupInviteId"`);
    await queryRunner.query(`DROP TABLE "invite"`);
  }
}
