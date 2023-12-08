import { ROLES } from "constants/role.constants";
import { Role } from "entities/Role.entity";
import { MigrationInterface, QueryRunner } from "typeorm";

export class Role1701813035391 implements MigrationInterface {
  name = "Role1701813035391";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "role" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "roleId" integer`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.manager.save(
      queryRunner.manager.create<Role>(Role, {
        name: ROLES.ADMIN_GROUP,
      }),
    );

    await queryRunner.manager.save(
      queryRunner.manager.create<Role>(Role, {
        name: ROLES.USER_GROUP,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
