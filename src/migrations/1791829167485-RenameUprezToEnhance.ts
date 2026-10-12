import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Renames the Studio "uprez" app and its algorithms to "enhance".
 *
 * `prompt` is a `json` column, and rows usually hold a JSON string that
 * itself encodes the prompt object, so each value is unwrapped, edited as
 * jsonb and written back in the same shape. Only matching rows are touched.
 * "nvidia-uprez" is a different algorithm and is left alone.
 */
const renamePrompts = (
  table: "dream" | "playlist",
  where: string,
  edit: string,
): string => `
  WITH parsed AS (
    SELECT
      id,
      json_typeof(prompt) = 'string' AS wrapped,
      CASE
        WHEN json_typeof(prompt) = 'string'
          THEN try_parse_jsonb(prompt #>> '{}')
        ELSE prompt::jsonb
      END AS p
    FROM "${table}"
    WHERE prompt IS NOT NULL
  )
  UPDATE "${table}" t
  SET prompt = CASE
    WHEN parsed.wrapped THEN to_json((${edit})::text)
    ELSE (${edit})::json
  END
  FROM parsed
  WHERE t.id = parsed.id AND jsonb_typeof(parsed.p) = 'object' AND ${where}`;

const setKey = (expr: string, key: string, value: string): string =>
  `jsonb_set(${expr}, '{${key}}', '"${value}"')`;

export class RenameUprezToEnhance1791829167485 implements MigrationInterface {
  name = "RenameUprezToEnhance1791829167485";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, "uprez", "enhance");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rename(queryRunner, "enhance", "uprez");
  }

  private async rename(
    queryRunner: QueryRunner,
    from: string,
    to: string,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "editor_project" SET "editorId" = $1 WHERE "editorId" = $2`,
      [to, from],
    );

    await queryRunner.query(
      renamePrompts(
        "dream",
        `parsed.p->>'infinidream_algorithm' = '${from}'`,
        setKey("parsed.p", "infinidream_algorithm", to),
      ),
    );

    // Playlists: the playlist algorithm and the per-dream algorithm it runs.
    await queryRunner.query(
      renamePrompts(
        "playlist",
        `parsed.p->>'infinidream_algorithm' = '${from}_playlist'`,
        setKey("parsed.p", "infinidream_algorithm", `${to}_playlist`),
      ),
    );
    await queryRunner.query(
      renamePrompts(
        "playlist",
        `parsed.p->>'infinidream_algorithm' = '${to}_playlist' AND parsed.p->>'dream_algorithm' = '${from}'`,
        setKey("parsed.p", "dream_algorithm", to),
      ),
    );
  }
}
