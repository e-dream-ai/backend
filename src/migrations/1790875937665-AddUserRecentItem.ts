import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRecentItem1790875937665 implements MigrationInterface {
  name = "AddUserRecentItem1790875937665";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_recent_item_type_enum" AS ENUM('prompt', 'style')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_recent_item" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" "public"."user_recent_item_type_enum" NOT NULL, "dreamId" integer NOT NULL, "lastUsedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2d3fa7d59555e6276054315285d" UNIQUE ("userId", "type", "dreamId"), CONSTRAINT "PK_c02d7e9751eced1c39b1240dfb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b49a86afde7803b05f71525bf9" ON "user_recent_item" ("dreamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f89c5bc9d015775e3f40363f3d" ON "user_recent_item" ("userId", "type", "lastUsedAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_recent_item" ADD CONSTRAINT "FK_f84aa57901bf67b29a3bf6f47a6" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_recent_item" ADD CONSTRAINT "FK_b49a86afde7803b05f71525bf90" FOREIGN KEY ("dreamId") REFERENCES "dream"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_recent_item" DROP CONSTRAINT "FK_b49a86afde7803b05f71525bf90"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_recent_item" DROP CONSTRAINT "FK_f84aa57901bf67b29a3bf6f47a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f89c5bc9d015775e3f40363f3d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b49a86afde7803b05f71525bf9"`,
    );
    await queryRunner.query(`DROP TABLE "user_recent_item"`);
    await queryRunner.query(`DROP TYPE "public"."user_recent_item_type_enum"`);
  }
}
