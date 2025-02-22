import { MigrationInterface, QueryRunner } from "typeorm";

export class Report1740184017127 implements MigrationInterface {
  name = "Report1740184017127";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "report" ("id" SERIAL NOT NULL, "processed" boolean NOT NULL DEFAULT false, "description" character varying, "link" character varying, "reportedAt" TIMESTAMP, "processedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "dreamId" integer, "reportedById" integer, "processedById" integer, CONSTRAINT "PK_99e4d0bea58cba73c57f935a546" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_3b00f29d501d25514a54eefec3e" FOREIGN KEY ("dreamId") REFERENCES "dream"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_c1582f1b6a1f1c77bc5cd01480c" FOREIGN KEY ("reportedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_492dd809a417d02e2cf41347f9f" FOREIGN KEY ("processedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_492dd809a417d02e2cf41347f9f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_c1582f1b6a1f1c77bc5cd01480c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_3b00f29d501d25514a54eefec3e"`,
    );
    await queryRunner.query(`DROP TABLE "report"`);
  }
}
