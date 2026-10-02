import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTryParseJsonbFunction1790875937666
implements MigrationInterface
{
  name = "AddTryParseJsonbFunction1790875937666";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION "public"."try_parse_jsonb"(value text) RETURNS jsonb
       LANGUAGE plpgsql IMMUTABLE STRICT AS $$
       BEGIN
         RETURN value::jsonb;
       EXCEPTION
         WHEN invalid_text_representation THEN RETURN NULL;
       END;
       $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "public"."try_parse_jsonb"(text)`,
    );
  }
}
