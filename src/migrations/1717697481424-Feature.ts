import { FEATURES } from "constants/feature.constants";
import { Feature } from "entities/Feature.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class Feature1717697481424 implements MigrationInterface {
  name = "Feature1717697481424";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feature" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_4832be692a2dc63d67e8e93c758" UNIQUE ("name"), CONSTRAINT "PK_03930932f909ca4be8e33d16a2d" PRIMARY KEY ("id"))`,
    );

    await queryRunner.manager.save(
      queryRunner.manager.create<Feature>(Feature, {
        name: FEATURES.SIGNUP_WITH_CODE,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feature"`);
  }
}
