import { dreamRepository } from "database/repositories";
import { Dream } from "entities";
import { FindOptionsSelect, In } from "typeorm";
import { DreamMediaType, DreamStatusType } from "types/dream.types";
import { PromptHistorySort } from "types/prompt-history.types";
import { RecentItemType } from "types/recent-item.types";
import { escapeLikePattern } from "utils/like-pattern.util";
import { transformDreamsWithSignedUrls } from "utils/transform.util";

const HISTORY = `
  history AS (
    SELECT
      dream.id,
      dream.name,
      dream.created_at,
      COALESCE(recent."lastUsedAt", dream.created_at) AS "lastUsedAt",
      recipe ->> 'infinidream_algorithm' AS algorithm,
      recipe ->> 'prompt' AS prompt
    FROM dream
    CROSS JOIN LATERAL try_parse_jsonb(dream.prompt #>> '{}') AS recipe
    LEFT JOIN user_recent_item recent
      ON recent."dreamId" = dream.id
      AND recent."userId" = $1
      AND recent.type = $2
    WHERE dream."userId" = $1
      AND dream."mediaType" = $3
      AND dream.status = $4
      AND dream.deleted_at IS NULL
      AND dream.thumbnail IS NOT NULL
      AND COALESCE(recipe ->> 'prompt', '') <> ''
      AND NOT recipe ? 'style_prompt'
      AND ($5::text IS NULL OR recipe ->> 'infinidream_algorithm' = $5)
      AND (
        $6::text IS NULL
        OR dream.name ILIKE $6
        OR recipe ->> 'prompt' ILIKE $6
      )
  )
`;

const LATEST_PER_PROMPT = `
  filtered AS (
    SELECT * FROM (
      SELECT
        history.*,
        ROW_NUMBER() OVER (
          PARTITION BY history.algorithm, history.prompt
          ORDER BY history."lastUsedAt" DESC, history.id DESC
        ) AS variant
      FROM history
    ) ranked
    WHERE ranked.variant = 1
  )
`;

const ALL_VARIANTS = `filtered AS (SELECT * FROM history)`;

const ORDER_BY: Record<PromptHistorySort, string> = {
  [PromptHistorySort.RECENT]: `filtered."lastUsedAt" DESC, filtered.id DESC`,
  [PromptHistorySort.DATE]: `filtered.created_at DESC, filtered.id DESC`,
  [PromptHistorySort.NAME]: `LOWER(filtered.name) ASC NULLS LAST, filtered.id DESC`,
};

const PROMPT_HISTORY_COLUMNS: FindOptionsSelect<Dream> = {
  id: true,
  uuid: true,
  name: true,
  thumbnail: true,
  prompt: true,
  status: true,
  mediaType: true,
  processedMediaWidth: true,
  processedMediaHeight: true,
  created_at: true,
};

export const getPromptHistory = async ({
  userId,
  search,
  algorithm,
  sort,
  distinct,
  take,
  skip,
}: {
  userId: number;
  search?: string;
  algorithm?: string;
  sort: PromptHistorySort;
  distinct: boolean;
  take: number;
  skip: number;
}): Promise<{ dreams: Dream[]; count: number }> => {
  const params = [
    userId,
    RecentItemType.PROMPT,
    DreamMediaType.IMAGE,
    DreamStatusType.PROCESSED,
    algorithm ?? null,
    search ? `%${escapeLikePattern(search)}%` : null,
  ];
  const filtered = `WITH ${HISTORY}, ${
    distinct ? LATEST_PER_PROMPT : ALL_VARIANTS
  }`;

  const page: { id: number; count: number }[] = await dreamRepository.query(
    `${filtered}
     SELECT filtered.id, COUNT(*) OVER ()::int AS count
     FROM filtered
     ORDER BY ${ORDER_BY[sort]}
     LIMIT $7 OFFSET $8`,
    [...params, take, skip],
  );

  if (page.length === 0) {
    if (skip === 0) return { dreams: [], count: 0 };
    const [{ count }]: { count: number }[] = await dreamRepository.query(
      `${filtered} SELECT COUNT(*)::int AS count FROM filtered`,
      params,
    );
    return { dreams: [], count };
  }

  const ids = page.map(({ id }) => id);
  const found = await dreamRepository.find({
    where: { id: In(ids) },
    select: PROMPT_HISTORY_COLUMNS,
  });
  const byId = new Map(found.map((dream) => [dream.id, dream]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((dream): dream is Dream => Boolean(dream));

  return {
    dreams: await transformDreamsWithSignedUrls(ordered),
    count: page[0].count,
  };
};
