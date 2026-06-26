import { DreamMediaType } from "types/dream.types";
import { ModelCatalogEntry, PROVIDERS } from "types/model.types";

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: "kling-i2v",
    label: "Kling 3.0 Pro",
    provider: PROVIDERS.FAL,
    mediaType: DreamMediaType.VIDEO,
    constraints: {
      durationsSec: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      supportsSteps: false,
    },
    pricing: { kind: "perSecond", usdPerSecond: 0.112 },
  },
  {
    id: "kling-25-i2v",
    label: "Kling 2.5 Turbo Pro",
    provider: PROVIDERS.FAL,
    mediaType: DreamMediaType.VIDEO,
    constraints: {
      durationsSec: [5, 10],
      supportsSteps: false,
    },
    pricing: { kind: "perSecond", usdPerSecond: 0.07, baseUsd: 0.35 },
  },
  {
    id: "ltx-i2v",
    label: "LTX 2.3",
    provider: PROVIDERS.RUNPOD,
    mediaType: DreamMediaType.VIDEO,
    constraints: {
      durationsSec: [5, 10, 15, 20],
      supportsSteps: true,
    },
  },
  {
    id: "flux-schnell",
    label: "FLUX.1 [schnell]",
    provider: PROVIDERS.FAL,
    mediaType: DreamMediaType.IMAGE,
    constraints: {
      imageSizes: ["1024*768", "1024*1024", "768*1024", "1280*720", "720*1280"],
    },
    pricing: { kind: "perMegapixel", usdPerMegapixel: 0.003 },
  },
  {
    id: "z-image-turbo",
    label: "Z Image Turbo",
    provider: PROVIDERS.RUNPOD,
    mediaType: DreamMediaType.IMAGE,
    constraints: {
      imageSizes: [
        "1280*720",
        "1024*1024",
        "720*1280",
        "512*512",
        "768*768",
        "1280*1280",
        "1024*768",
        "768*1024",
      ],
    },
  },
  {
    id: "qwen-image",
    label: "Qwen Image",
    provider: PROVIDERS.RUNPOD,
    mediaType: DreamMediaType.IMAGE,
    constraints: {
      imageSizes: ["1280*720", "1024*1024", "720*1280", "512*512"],
    },
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

export const getModelById = (id: string): ModelCatalogEntry | undefined =>
  MODEL_CATALOG.find((model) => model.id === id);
