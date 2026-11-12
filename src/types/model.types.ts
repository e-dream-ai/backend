import { SupportedAlgorithm } from "utils/prompt.util";
import { DreamMediaType } from "types/dream.types";

export const PROVIDERS = {
  FAL: "fal",
  RUNPOD: "runpod",
} as const;

export type ModelProvider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export interface GuidanceConstraint {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
}

/** A named choice the provider takes from a fixed list, like Krea's creativity. */
export interface OptionConstraint {
  readonly options: readonly string[];
  readonly default: string;
}

export interface ModelConstraints {
  durationsSec?: number[];
  imageSizes?: string[];
  supportsSteps?: boolean;
  supportsNegativePrompt?: boolean;
  guidance?: GuidanceConstraint;
  creativity?: OptionConstraint;
}

export type ModelPricing =
  | { kind: "perMegapixel"; usdPerMegapixel: number }
  | { kind: "perSecond"; usdPerSecond: number; baseUsd?: number }
  | { kind: "perImage"; usdPerImage: number };

export interface ModelCatalogEntry {
  id: SupportedAlgorithm;
  label: string;
  provider: ModelProvider;
  mediaType: DreamMediaType;
  constraints: ModelConstraints;
  pricing?: ModelPricing;
}

export interface GetModelsQuery {
  mediaType?: DreamMediaType;
}
