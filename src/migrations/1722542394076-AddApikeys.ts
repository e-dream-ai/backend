import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApikeys1722542394076 implements MigrationInterface {
  name = "AddApikeys1722542394076";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" SERIAL NOT NULL, "apikey" character varying(256) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "UQ_3105fa6c448e8846c395244f438" UNIQUE ("apikey"), CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_APIKEY_KEY" ON "api_key" ("apikey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_APIKEY_KEY"`);
    await queryRunner.query(`DROP TABLE "api_key"`);
  }
}
