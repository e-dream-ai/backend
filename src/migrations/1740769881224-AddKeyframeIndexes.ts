import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKeyframeIndexes1740769881224 implements MigrationInterface {
  name = "AddKeyframeIndexes1740769881224";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_5f243c7b78401c7dc91d72773a" ON "playlist_keyframe" ("playlistId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b5c8b60015ad3a0b04bfaf9e6" ON "playlist_keyframe" ("keyframeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4785ce0d5579ecb2d6fa6ff00" ON "playlist_keyframe" ("order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cc58ed5deeddcee038adbae43" ON "keyframe" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c91caefd5728a120d1b723ac52" ON "keyframe" ("displayedOwnerId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c91caefd5728a120d1b723ac52"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1cc58ed5deeddcee038adbae43"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4785ce0d5579ecb2d6fa6ff00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b5c8b60015ad3a0b04bfaf9e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f243c7b78401c7dc91d72773a"`,
    );
  }
}
