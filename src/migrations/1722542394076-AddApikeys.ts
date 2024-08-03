import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApikeys1722542394076 implements MigrationInterface {
  name = "AddApikeys1722542394076";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" SERIAL NOT NULL, "apikey" character varying NOT NULL, "hash" character varying NOT NULL, "iv" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "expires_at" TIMESTAMP, "deleted_at" TIMESTAMP, "userId" integer, CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_HASH" ON "api_key" ("hash") `);
    await queryRunner.query(
      `ALTER TABLE "api_key" ADD CONSTRAINT "FK_277972f4944205eb29127f9bb6c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_key" DROP CONSTRAINT "FK_277972f4944205eb29127f9bb6c"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_HASH"`);
    await queryRunner.query(`DROP TABLE "api_key"`);
  }
}
