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

export interface ModelCatalogEntry {
  id: SupportedAlgorithm;
  label: string;
  provider: ModelProvider;
  mediaType: DreamMediaType;
  constraints: ModelConstraints;
}

export interface GetModelsQuery {
  mediaType?: DreamMediaType;
}
