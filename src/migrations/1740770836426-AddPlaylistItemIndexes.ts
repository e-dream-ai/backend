import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlaylistItemIndexes1740770836426 implements MigrationInterface {
  name = "AddPlaylistItemIndexes1740770836426";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_9b9b229772d88966e7d9959d90" ON "playlist_item" ("playlistId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6a0e556753ef19c8914103312" ON "playlist_item" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f72102e7ac109f47b916c36945" ON "playlist_item" ("dreamItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6dc588a3e0b75d0e34e60506f6" ON "playlist_item" ("playlistItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_562f13f9b1e22cf0127160f8a7" ON "playlist_item" ("order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5de237a438d298031d11a57c3" ON "vote" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aeeb751d7580766003467633f6" ON "vote" ("dreamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d4aea3abbfe474c76962134cb" ON "vote" ("vote") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92ca9b9b5394093adb6e5f55c4" ON "playlist" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c64ab14fba57ece9b129b8c04" ON "playlist" ("displayedOwnerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8deb0d8954d6113f50b833eeb" ON "playlist" ("featureRank") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30da0ecff9d07bebd4669962b2" ON "dream" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97865d6a6cb5686980d9098029" ON "dream" ("displayedOwnerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_25627f53df058c8d88708cf9da" ON "dream" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b119a64b61c12b50619c2081c" ON "dream" ("featureRank") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_214193ff78042aa8d3f6e69eb0" ON "dream" ("startKeyframeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5bc5bf4c9bdb12629906568f72" ON "dream" ("endKeyframeId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5bc5bf4c9bdb12629906568f72"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_214193ff78042aa8d3f6e69eb0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b119a64b61c12b50619c2081c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25627f53df058c8d88708cf9da"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97865d6a6cb5686980d9098029"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30da0ecff9d07bebd4669962b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8deb0d8954d6113f50b833eeb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c64ab14fba57ece9b129b8c04"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92ca9b9b5394093adb6e5f55c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d4aea3abbfe474c76962134cb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aeeb751d7580766003467633f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f5de237a438d298031d11a57c3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_562f13f9b1e22cf0127160f8a7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6dc588a3e0b75d0e34e60506f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f72102e7ac109f47b916c36945"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f6a0e556753ef19c8914103312"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b9b229772d88966e7d9959d90"`,
    );
  }
}
