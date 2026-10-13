import { FindOperator } from "typeorm";
import { getFeedFindOptionsWhere } from "utils/feed.util";
import { groupedFeedSchema } from "schemas/feed.schema";
import { FEED_ORPHANS_FILTERS, FeedOrphansFilter } from "types/feed.types";

type DreamCondition = { id?: FindOperator<unknown> };

const getDreamConditions = (
  orphans?: FeedOrphansFilter,
  isAdmin = false,
): DreamCondition[] => {
  const [dreamWhere] = getFeedFindOptionsWhere(
    {},
    { userId: 1, isAdmin, orphans },
  );
  const dreamItem = dreamWhere.dreamItem as DreamCondition | DreamCondition[];
  return Array.isArray(dreamItem) ? dreamItem : [dreamItem];
};

const getIdSql = (condition: DreamCondition) =>
  condition.id?.getSql?.("dream.id");

describe("feed orphans filter", () => {
  it("leaves dreams unfiltered when orphans is not set", () => {
    getDreamConditions().forEach((condition) => {
      expect(condition.id).toBeUndefined();
    });
  });

  it("keeps only dreams in a live playlist when orphans is hide", () => {
    [false, true].forEach((isAdmin) => {
      getDreamConditions("hide", isAdmin).forEach((condition) => {
        const sql = getIdSql(condition);
        expect(sql).toMatch(/^EXISTS \(/);
        expect(sql).toContain("pi.\"dreamItemId\" = dream.id");
        expect(sql).toContain("pi.deleted_at IS NULL");
        expect(sql).toContain("p.deleted_at IS NULL");
      });
    });
  });

  it("keeps only dreams in no live playlist when orphans is only", () => {
    getDreamConditions("only").forEach((condition) => {
      expect(getIdSql(condition)).toMatch(/^NOT EXISTS \(/);
    });
  });
});

describe("grouped feed orphans param", () => {
  it("accepts hide and only", () => {
    FEED_ORPHANS_FILTERS.forEach((orphans) => {
      expect(
        groupedFeedSchema.query.validate({ orphans }).error,
      ).toBeUndefined();
    });
  });

  it("rejects any other value", () => {
    expect(
      groupedFeedSchema.query.validate({ orphans: "bogus" }).error,
    ).toBeDefined();
  });
});
