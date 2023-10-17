import { MigrationInterface, QueryRunner } from "typeorm";

export class Vote1697481221585 implements MigrationInterface {
  name = "Vote1697481221585";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."vote_vote_enum" AS ENUM('none', 'upvote', 'downvote')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vote" ("id" SERIAL NOT NULL, "vote" "public"."vote_vote_enum" NOT NULL DEFAULT 'none', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "dreamId" integer, CONSTRAINT "REL_f5de237a438d298031d11a57c3" UNIQUE ("userId"), CONSTRAINT "PK_2d5932d46afe39c8176f9d4be72" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "upvotes" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD "downvotes" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "FK_f5de237a438d298031d11a57c3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "FK_aeeb751d7580766003467633f61" FOREIGN KEY ("dreamId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_aeeb751d7580766003467633f61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" DROP CONSTRAINT "FK_f5de237a438d298031d11a57c3b"`,
    );
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "downvotes"`);
    await queryRunner.query(`ALTER TABLE "dream" DROP COLUMN "upvotes"`);
    await queryRunner.query(`DROP TABLE "vote"`);
    await queryRunner.query(`DROP TYPE "public"."vote_vote_enum"`);
  }
}
