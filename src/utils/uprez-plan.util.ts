import { isDeepStrictEqual } from "node:util";
import type { Dream, PlaylistItem } from "entities";
import { DreamStatusType } from "types/dream.types";
import { parsePromptJson, PromptJson } from "./prompt.util";

/**
 * Counts for one uprez run. The same shape is returned by the dry-run
 * preview and by the real run, so the UI can say what a run *would* do.
 */
export interface UprezRunSummary {
  /** New uprez dreams queued. */
  created: number;
  /** Failed uprez dreams at the current settings, queued again. */
  requeued: number;
  /** Uprez dreams already at the current settings, left alone. */
  kept: number;
  /** Earlier uprez dreams at the current settings, linked back in. */
  reused: number;
  /** Uprez dreams at other settings, taken out of the playlist. */
  replaced: number;
  /** Of `replaced`, how many were still in flight and get cancelled. */
  cancelled: number;
  /** Uprez dreams whose source left the source playlist. */
  removed: number;
  /** Source dreams not yet processed, so there's nothing to uprez. */
  skipped: number;
  hasWork: boolean;
}

export interface RunUprezPlaylistResult extends UprezRunSummary {
  linked: number;
}

export interface UprezPlan {
  result: UprezRunSummary;
  sourceOrder: Map<string, number>;
  /** Playlist item ids to take out: obsolete sources and replaced dreams. */
  itemIdsToRemove: number[];
  /** Replaced dreams still queued or processing. */
  dreamsToCancel: Dream[];
  /** Failed dreams at the current settings. */
  dreamsToRequeue: Dream[];
  /** Earlier uprez dreams to link back in, with their source position. */
  dreamsToReuse: { dream: Dream; order: number }[];
  /** Source dreams that need a fresh uprez, with their source position. */
  sourcesToCreate: { source: Dream; order: number }[];
}

export const IN_FLIGHT_STATUSES: DreamStatusType[] = [
  DreamStatusType.NONE,
  DreamStatusType.QUEUE,
  DreamStatusType.PROCESSING,
];

export const getSourceDreamUuid = (
  dream: Dream | null | undefined,
): string | null => {
  if (!dream) return null;
  const value = parsePromptJson(dream)?.source_dream_uuid;
  return typeof value === "string" ? value : null;
};

/**
 * Whether a derived dream was made by `dreamAlgorithm` with every one of
 * `params`. Only the keys the playlist sets are compared, so a derived dream
 * carrying extra fields (video_uuid, source_dream_uuid) still matches.
 */
export const matchesUprezSettings = (
  prompt: PromptJson | null,
  dreamAlgorithm: string,
  params: Record<string, unknown>,
): boolean =>
  !!prompt &&
  prompt.infinidream_algorithm === dreamAlgorithm &&
  Object.entries(params).every(([key, value]) =>
    isDeepStrictEqual(prompt[key], value),
  );

/**
 * Decide what a run does, without touching the database.
 *
 * `candidates` are the runner's other uprez dreams of these sources, possibly
 * in no playlist at all: the results of earlier runs at other settings. A
 * processed one that matches the current settings is linked back in instead
 * of being rendered again.
 */
export const planUprezRun = ({
  sourceDreams,
  derivedItems,
  candidates,
  dreamAlgorithm,
  params,
}: {
  sourceDreams: Dream[];
  derivedItems: PlaylistItem[];
  candidates: Dream[];
  dreamAlgorithm: string;
  params: Record<string, unknown>;
}): UprezPlan => {
  const sourceOrder = new Map(
    sourceDreams.map((dream, index) => [dream.uuid, index]),
  );

  const plan: UprezPlan = {
    result: {
      created: 0,
      requeued: 0,
      kept: 0,
      reused: 0,
      replaced: 0,
      cancelled: 0,
      removed: 0,
      skipped: 0,
      hasWork: false,
    },
    sourceOrder,
    itemIdsToRemove: [],
    dreamsToCancel: [],
    dreamsToRequeue: [],
    dreamsToReuse: [],
    sourcesToCreate: [],
  };
  const { result } = plan;

  const existingBySource = new Map<string, { itemId: number; dream: Dream }>();
  const inPlaylist = new Set<string>();
  for (const item of derivedItems) {
    const dream = item.dreamItem;
    const srcUuid = getSourceDreamUuid(dream);
    if (!dream || !srcUuid) continue;
    inPlaylist.add(dream.uuid);
    if (!sourceOrder.has(srcUuid)) {
      plan.itemIdsToRemove.push(item.id);
      result.removed += 1;
    } else {
      existingBySource.set(srcUuid, { itemId: item.id, dream });
    }
  }

  // Newest first, so the most recent matching render wins.
  const reusableBySource = new Map<string, Dream>();
  for (const dream of [...candidates].sort((a, b) => b.id - a.id)) {
    if (dream.status !== DreamStatusType.PROCESSED) continue;
    if (inPlaylist.has(dream.uuid)) continue;
    const prompt = parsePromptJson(dream);
    const srcUuid = prompt?.source_dream_uuid;
    if (typeof srcUuid !== "string" || reusableBySource.has(srcUuid)) continue;
    if (!matchesUprezSettings(prompt, dreamAlgorithm, params)) continue;
    reusableBySource.set(srcUuid, dream);
  }

  for (const [order, source] of sourceDreams.entries()) {
    if (source.status !== DreamStatusType.PROCESSED) {
      result.skipped += 1;
      continue;
    }

    const existing = existingBySource.get(source.uuid);

    if (existing) {
      const { itemId, dream } = existing;
      if (
        matchesUprezSettings(parsePromptJson(dream), dreamAlgorithm, params)
      ) {
        if (dream.status === DreamStatusType.FAILED) {
          plan.dreamsToRequeue.push(dream);
          result.requeued += 1;
        } else {
          result.kept += 1;
        }
        continue;
      }

      plan.itemIdsToRemove.push(itemId);
      result.replaced += 1;
      if (IN_FLIGHT_STATUSES.includes(dream.status)) {
        plan.dreamsToCancel.push(dream);
        result.cancelled += 1;
      }
    }

    const reusable = reusableBySource.get(source.uuid);
    if (reusable) {
      plan.dreamsToReuse.push({ dream: reusable, order });
      result.reused += 1;
    } else {
      plan.sourcesToCreate.push({ source, order });
      result.created += 1;
    }
  }

  result.hasWork =
    result.created +
      result.requeued +
      result.reused +
      result.replaced +
      result.removed >
    0;

  return plan;
};
