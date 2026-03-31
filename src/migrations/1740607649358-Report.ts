import { ReportType } from "entities/ReportType.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class Report1740607649358 implements MigrationInterface {
  name = "Report1740607649358";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "report_type" ("id" SERIAL NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_324366e10cf40cf2ac60c502a00" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "report" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "processed" boolean NOT NULL DEFAULT false, "comments" character varying, "link" character varying, "reportedAt" TIMESTAMP, "processedAt" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "typeId" integer, "dreamId" integer, "reportedById" integer, "processedById" integer, CONSTRAINT "PK_99e4d0bea58cba73c57f935a546" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d75f0b67c2116a6f200930849" ON "report" ("uuid") `,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_ca59fe41856513666385a324028" FOREIGN KEY ("typeId") REFERENCES "report_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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

    const TYPES = [
      { type: "Spam content" },
      { type: "Not safe for work (NSFW)" },
      { type: "Contains visible title, watermark, or bug" },
      { type: "Potentially unlicensed (original source needed)" },
      { type: "Illegal or harassing material" },
      { type: "Other content issue" },
    ];

    await Promise.all(
      TYPES.map((typeData) =>
        queryRunner.manager.save(
          queryRunner.manager.create(ReportType, {
            description: typeData.type,
          }),
        ),
      ),
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
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_ca59fe41856513666385a324028"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d75f0b67c2116a6f200930849"`,
    );
    await queryRunner.query(`DROP TABLE "report"`);
    await queryRunner.query(`DROP TABLE "report_type"`);
  }
}
