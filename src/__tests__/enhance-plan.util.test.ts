import type { Dream, PlaylistItem } from "entities";
import { DreamStatusType } from "types/dream.types";
import type { Keyframe } from "entities";
import { planEnhanceKeyframes, planEnhanceRun } from "utils/enhance-plan.util";

let nextId = 1;

const source = (uuid: string, status = DreamStatusType.PROCESSED): Dream =>
  ({ id: nextId++, uuid, status }) as Dream;

// Prompts are stored JSON-encoded, as the run writes them.
const enhance = (
  src: string,
  factors: { upscale_factor: number; interpolation_factor: number },
  status = DreamStatusType.PROCESSED,
): Dream =>
  ({
    id: nextId++,
    uuid: `enhance-${nextId}`,
    status,
    prompt: JSON.stringify({
      ...factors,
      infinidream_algorithm: "enhance",
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
  planEnhanceRun({
    sourceDreams,
    derivedItems: derived.map(item),
    candidates,
    dreamAlgorithm: "enhance",
    params,
  });

describe("planEnhanceRun", () => {
  const a = source("a");
  const b = source("b");

  it("creates an enhanced dream for every processed source on a first run", () => {
    const { result, sourcesToCreate } = plan({
      sourceDreams: [a, b, source("c", DreamStatusType.PROCESSING)],
    });
    expect(result).toMatchObject({ created: 2, skipped: 1, kept: 0 });
    expect(sourcesToCreate.map((s) => s.order)).toEqual([0, 1]);
  });

  it("does nothing when every enhanced dream is already at the current settings", () => {
    const { result } = plan({
      sourceDreams: [a, b],
      derived: [enhance("a", X2), enhance("b", X2, DreamStatusType.PROCESSING)],
    });
    expect(result).toMatchObject({ kept: 2, created: 0, replaced: 0 });
    expect(result.hasWork).toBe(false);
  });

  it("replaces enhanced dreams made at other settings", () => {
    const doneA = enhance("a", X2);
    const runningB = enhance("b", X2, DreamStatusType.PROCESSING);
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
    expect(p.result.hasWork).toBe(true);
  });

  it("links an earlier render back in instead of rendering it again", () => {
    const earlier = enhance("a", X2);
    const p = plan({
      sourceDreams: [a, b],
      derived: [enhance("a", X4), enhance("b", X4)],
      candidates: [earlier, enhance("b", X2, DreamStatusType.FAILED)],
      params: X2,
    });
    expect(p.result).toMatchObject({ replaced: 2, reused: 1, created: 1 });
    expect(p.dreamsToReuse).toEqual([{ dream: earlier, order: 0 }]);
    expect(p.sourcesToCreate.map((s) => s.source)).toEqual([b]);
  });

  it("prefers the newest matching earlier render", () => {
    const older = enhance("a", X2);
    const newer = enhance("a", X2);
    const p = plan({ sourceDreams: [a], candidates: [older, newer] });
    expect(p.dreamsToReuse[0].dream).toBe(newer);
  });

  it("ignores other algorithms that also record a source dream", () => {
    const ltx = {
      ...enhance("a", X2),
      prompt: JSON.stringify({
        ...X2,
        infinidream_algorithm: "ltx-i2v",
        source_dream_uuid: "a",
      }),
    } as Dream;
    const p = plan({ sourceDreams: [a], candidates: [ltx] });
    expect(p.result).toMatchObject({ reused: 0, created: 1 });
  });

  it("requeues a failed enhanced dream at the current settings", () => {
    const failed = enhance("a", X2, DreamStatusType.FAILED);
    const p = plan({ sourceDreams: [a], derived: [failed] });
    expect(p.result).toMatchObject({ requeued: 1, created: 0 });
    expect(p.dreamsToRequeue).toEqual([failed]);
  });

  it("removes enhanced dreams whose source left the source playlist", () => {
    const p = plan({
      sourceDreams: [a],
      derived: [enhance("a", X2), enhance("gone", X2)],
    });
    expect(p.result).toMatchObject({ removed: 1, kept: 1 });
    expect(p.result.hasWork).toBe(true);
  });
});

describe("planEnhanceKeyframes", () => {
  const kf = (uuid: string): Keyframe => ({ uuid, name: uuid }) as Keyframe;
  const linked = (
    uuid: string,
    start: Keyframe | null,
    end: Keyframe | null,
  ): Dream =>
    ({ ...source(uuid), startKeyframe: start, endKeyframe: end }) as Dream;
  const keyframesOf = (sources: Dream[]) => {
    const enhanced = sources.map((src) => enhance(src.uuid, X2));
    const { keyframes, links } = planEnhanceKeyframes(sources, enhanced);
    return {
      keyframes: keyframes.map((keyframe) => keyframe.sourceUuid),
      links: links.map(({ start, end }) => [start, end]),
      dreamIds: links.map((link) => link.dreamId),
      enhanced,
    };
  };

  it("makes no keyframes when the source has none", () => {
    const { keyframes, links } = keyframesOf([
      linked("a", null, null),
      linked("b", null, null),
    ]);
    expect(keyframes).toEqual([]);
    expect(links).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("copies a chain, sharing keyframes where the sources do", () => {
    const [k1, k2, k3] = [kf("k1"), kf("k2"), kf("k3")];
    const { keyframes, links } = keyframesOf([
      linked("a", k1, k2),
      linked("b", k2, k3),
    ]);
    expect(keyframes).toEqual(["k1", "k2", "k3"]);
    expect(links).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it("carries a loop over", () => {
    const [k1, k2] = [kf("k1"), kf("k2")];
    const { keyframes, links } = keyframesOf([
      linked("a", k1, k2),
      linked("b", k2, k1),
    ]);
    expect(keyframes).toEqual(["k1", "k2"]);
    expect(links).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("copies partial links without inventing the missing ones", () => {
    const [k1, k2] = [kf("k1"), kf("k2")];
    const { keyframes, links } = keyframesOf([
      linked("a", null, k1),
      linked("b", k1, null),
      linked("c", null, null),
      linked("d", k2, null),
    ]);
    expect(keyframes).toEqual(["k1", "k2"]);
    expect(links).toEqual([
      [null, 0],
      [0, null],
      [null, null],
      [1, null],
    ]);
  });

  it("follows the enhanced dreams' sources, not their position", () => {
    const [k1, k2] = [kf("k1"), kf("k2")];
    const a = linked("a", k1, k2);
    const b = linked("b", null, null);
    const enhanced = [enhance("b", X2), enhance("a", X2), source("manual")];
    const { links } = planEnhanceKeyframes([a, b], enhanced);
    expect(links).toEqual([
      { dreamId: enhanced[0].id, start: null, end: null },
      { dreamId: enhanced[1].id, start: 0, end: 1 },
    ]);
  });
});
