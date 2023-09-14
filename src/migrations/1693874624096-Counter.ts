import { MigrationInterface, QueryRunner } from "typeorm";

export class Counter1693874624096 implements MigrationInterface {
  name = "Counter1693874624096";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."counter_key_enum" AS ENUM('general-conter')`,
    );
    await queryRunner.query(
      `CREATE TABLE "counter" ("id" SERIAL NOT NULL, "key" "public"."counter_key_enum" NOT NULL DEFAULT 'general-conter', "value" integer NOT NULL, CONSTRAINT "PK_012f437b30fcf5a172841392ef3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "counter"`);
    await queryRunner.query(`DROP TYPE "public"."counter_key_enum"`);
  }
}
