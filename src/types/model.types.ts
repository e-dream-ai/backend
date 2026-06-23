import { SupportedAlgorithm } from "utils/prompt.util";
import { DreamMediaType } from "types/dream.types";

export const PROVIDERS = {
  FAL: "fal",
  RUNPOD: "runpod",
} as const;

export type ModelProvider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

export interface ModelConstraints {
  durationsSec?: number[];
  imageSizes?: string[];
  supportsSteps?: boolean;
}

export type ModelPricing =
  | { kind: "perMegapixel"; usdPerMegapixel: number }
  | { kind: "perSecond"; usdPerSecond: number; baseUsd?: number };

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
