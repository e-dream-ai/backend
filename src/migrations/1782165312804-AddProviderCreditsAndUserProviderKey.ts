import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProviderCreditsAndUserProviderKey1782165312804
implements MigrationInterface
{
  name = "AddProviderCreditsAndUserProviderKey1782165312804";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_provider_key" ("id" SERIAL NOT NULL, "provider" character varying(32) NOT NULL, "encryptedKey" text NOT NULL, "keyHash" character varying(64) NOT NULL, "isValid" boolean NOT NULL DEFAULT false, "lastValidatedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "UQ_USER_PROVIDER" UNIQUE ("userId", "provider"), CONSTRAINT "PK_d20645187bd0114e528e224577b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4529851d025f9e97a182b8fff6" ON "user_provider_key" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "providerCreditsUsd" numeric(10,4) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "dailyQuotaUsd" numeric(10,4) NOT NULL DEFAULT '10'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_provider_key" ADD CONSTRAINT "FK_4529851d025f9e97a182b8fff6a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_provider_key" DROP CONSTRAINT "FK_4529851d025f9e97a182b8fff6a"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dailyQuotaUsd"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "providerCreditsUsd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4529851d025f9e97a182b8fff6"`,
    );
    await queryRunner.query(`DROP TABLE "user_provider_key"`);
  }
}
