import { DreamMediaType } from "types/dream.types";
import { ModelCatalogEntry, PROVIDERS } from "types/model.types";

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: "kling-i2v",
    label: "Kling 3.0 Pro",
    provider: PROVIDERS.FAL,
    mediaType: DreamMediaType.VIDEO,
  },
  {
    id: "ltx-i2v",
    label: "LTX 2.3",
    provider: PROVIDERS.RUNPOD,
    mediaType: DreamMediaType.VIDEO,
  },
];

export const getModelCatalog = (
  mediaType?: DreamMediaType,
): ModelCatalogEntry[] => {
  if (!mediaType) {
    return MODEL_CATALOG;
  }
  return MODEL_CATALOG.filter((model) => model.mediaType === mediaType);
};
