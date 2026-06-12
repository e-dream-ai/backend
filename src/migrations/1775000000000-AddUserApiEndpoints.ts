import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserApiEndpoints1775000000000 implements MigrationInterface {
  name = "AddUserApiEndpoints1775000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_api_endpoint" (` +
        `"id" SERIAL NOT NULL, ` +
        `"uuid" character varying NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" integer NOT NULL, ` +
        `"name" character varying NOT NULL, ` +
        `"providerType" character varying NOT NULL, ` +
        `"presetId" character varying NOT NULL, ` +
        `"endpointUrl" character varying NOT NULL, ` +
        `"apiKeyEncrypted" character varying NOT NULL, ` +
        `"apiKeyIv" character varying NOT NULL, ` +
        `"apiKeyLastFour" character varying(4) NOT NULL, ` +
        `"modelId" character varying NOT NULL, ` +
        `"capabilities" jsonb NOT NULL, ` +
        `"created_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"deleted_at" TIMESTAMP, ` +
        `CONSTRAINT "UQ_user_api_endpoint_uuid" UNIQUE ("uuid"), ` +
        `CONSTRAINT "PK_user_api_endpoint" PRIMARY KEY ("id")` +
        `)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_api_endpoint_uuid" ON "user_api_endpoint" ("uuid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_api_endpoint_userId" ON "user_api_endpoint" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_api_endpoint" ADD CONSTRAINT "FK_user_api_endpoint_user" ` +
        `FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_api_endpoint" DROP CONSTRAINT "FK_user_api_endpoint_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_api_endpoint_userId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_api_endpoint_uuid"`);
    await queryRunner.query(`DROP TABLE "user_api_endpoint"`);
  }
}
