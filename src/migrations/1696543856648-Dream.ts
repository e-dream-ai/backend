import { MigrationInterface, QueryRunner } from "typeorm";

export class Dream1696543856648 implements MigrationInterface {
  name = "Dream1696543856648";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dream" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "video" character varying, "thumbnail" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_d12349ee35ed0f8338f4883e81d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "dream" ADD CONSTRAINT "FK_30da0ecff9d07bebd4669962b21" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dream" DROP CONSTRAINT "FK_30da0ecff9d07bebd4669962b21"`,
    );
    await queryRunner.query(`DROP TABLE "dream"`);
  }
}
