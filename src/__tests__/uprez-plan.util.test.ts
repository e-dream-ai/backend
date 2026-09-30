import type { Dream, PlaylistItem } from "entities";
import { DreamStatusType } from "types/dream.types";
import { planUprezRun, uprezRunHasWork } from "utils/uprez-plan.util";

let nextId = 1;

const source = (uuid: string, status = DreamStatusType.PROCESSED): Dream =>
  ({ id: nextId++, uuid, status }) as Dream;

// Prompts are stored JSON-encoded, as the run writes them.
const uprez = (
  src: string,
  factors: { upscale_factor: number; interpolation_factor: number },
  status = DreamStatusType.PROCESSED,
): Dream =>
  ({
    id: nextId++,
    uuid: `uprez-${nextId}`,
    status,
    prompt: JSON.stringify({
      ...factors,
      infinidream_algorithm: "uprez",
      video_uuid: src,
      source_dream_uuid: src,
    }),
  }) as Dream;

const item = (dreamItem: Dream): PlaylistItem =>
  ({ id: nextId++, dreamItem }) as PlaylistItem;

const X2 = { upscale_factor: 2, interpolation_factor: 2 };
const X4 = { upscale_factor: 4, interpolation_factor: 2 };

const plan = ({
  sourceDreams,
  derived = [],
  candidates = [],
  params = X2,
}: {
  sourceDreams: Dream[];
  derived?: Dream[];
  candidates?: Dream[];
  params?: Record<string, unknown>;
}) =>
  planUprezRun({
    sourceDreams,
    derivedItems: derived.map(item),
    candidates,
    dreamAlgorithm: "uprez",
    params,
  });

describe("planUprezRun", () => {
  const a = source("a");
  const b = source("b");

  it("creates an uprez for every processed source on a first run", () => {
    const { result, sourcesToCreate } = plan({
      sourceDreams: [a, b, source("c", DreamStatusType.PROCESSING)],
    });
    expect(result).toMatchObject({ created: 2, skipped: 1, kept: 0 });
    expect(sourcesToCreate.map((s) => s.order)).toEqual([0, 1]);
  });

  it("does nothing when every uprez is already at the current settings", () => {
    const { result } = plan({
      sourceDreams: [a, b],
      derived: [uprez("a", X2), uprez("b", X2, DreamStatusType.PROCESSING)],
    });
    expect(result).toMatchObject({ kept: 2, created: 0, replaced: 0 });
    expect(uprezRunHasWork(result)).toBe(false);
  });

  it("replaces uprezes made at other settings", () => {
    const doneA = uprez("a", X2);
    const runningB = uprez("b", X2, DreamStatusType.PROCESSING);
    const p = plan({
      sourceDreams: [a, b],
      derived: [doneA, runningB],
      params: X4,
    });
    expect(p.result).toMatchObject({
      replaced: 2,
      cancelled: 1,
      created: 2,
      kept: 0,
    });
    expect(p.dreamsToCancel).toEqual([runningB]);
    expect(p.itemIdsToRemove).toHaveLength(2);
    expect(uprezRunHasWork(p.result)).toBe(true);
  });

  it("links an earlier render back in instead of rendering it again", () => {
    const earlier = uprez("a", X2);
    const p = plan({
      sourceDreams: [a, b],
      derived: [uprez("a", X4), uprez("b", X4)],
      candidates: [earlier, uprez("b", X2, DreamStatusType.FAILED)],
      params: X2,
    });
    expect(p.result).toMatchObject({ replaced: 2, reused: 1, created: 1 });
    expect(p.dreamsToReuse).toEqual([{ dream: earlier, order: 0 }]);
    expect(p.sourcesToCreate.map((s) => s.source)).toEqual([b]);
  });

  it("prefers the newest matching earlier render", () => {
    const older = uprez("a", X2);
    const newer = uprez("a", X2);
    const p = plan({ sourceDreams: [a], candidates: [older, newer] });
    expect(p.dreamsToReuse[0].dream).toBe(newer);
  });

  it("ignores other algorithms that also record a source dream", () => {
    const ltx = {
      ...uprez("a", X2),
      prompt: JSON.stringify({
        ...X2,
        infinidream_algorithm: "ltx-i2v",
        source_dream_uuid: "a",
      }),
    } as Dream;
    const p = plan({ sourceDreams: [a], candidates: [ltx] });
    expect(p.result).toMatchObject({ reused: 0, created: 1 });
  });

  it("requeues a failed uprez at the current settings", () => {
    const failed = uprez("a", X2, DreamStatusType.FAILED);
    const p = plan({ sourceDreams: [a], derived: [failed] });
    expect(p.result).toMatchObject({ requeued: 1, created: 0 });
    expect(p.dreamsToRequeue).toEqual([failed]);
  });

  it("removes uprezes whose source left the source playlist", () => {
    const p = plan({
      sourceDreams: [a],
      derived: [uprez("a", X2), uprez("gone", X2)],
    });
    expect(p.result).toMatchObject({ removed: 1, kept: 1 });
    expect(uprezRunHasWork(p.result)).toBe(true);
  });
});
