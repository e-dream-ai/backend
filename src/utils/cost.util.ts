import { getModelById } from "constants/models.constants";
import { ModelCatalogEntry, ModelPricing } from "types/model.types";

export interface JobCostParams {
  durationSec?: number;
  imageSize?: string;
}

export const INVALID_JOB_PARAMS_CODE = "INVALID_JOB_PARAMS";

export class InvalidJobParamsError extends Error {
  readonly code = INVALID_JOB_PARAMS_CODE;

  constructor(message = "Invalid generation parameters.") {
    super(message);
    this.name = "InvalidJobParamsError";
  }
}

const parseMegapixels = (imageSize: string): number | null => {
  const match = imageSize.match(/^(\d+)\s*[*x]\s*(\d+)$/i);
  if (!match) return null;
  return (Number(match[1]) * Number(match[2])) / 1_000_000;
};

const assertValidParams = (
  model: ModelCatalogEntry,
  pricing: ModelPricing,
  params: JobCostParams,
): void => {
  const { constraints } = model;

  if (pricing.kind === "perSecond") {
    const duration = params.durationSec;
    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      throw new InvalidJobParamsError();
    }
    if (!constraints.durationsSec?.includes(duration)) {
      throw new InvalidJobParamsError();
    }
    return;
  }

  if (pricing.kind === "perMegapixel") {
    const size = params.imageSize;
    if (!size || parseMegapixels(size) == null) {
      throw new InvalidJobParamsError();
    }
    if (!constraints.imageSizes?.includes(size)) {
      throw new InvalidJobParamsError();
    }
  }
};

// KEEP IN SYNC with frontend/src/utils/model-cost.util.ts (estimateUnitCostUsd).
// The frontend mirrors this formula for the cost estimate UI. If you change one, change the other.
export const priceFromPricing = (
  pricing: ModelPricing,
  params: JobCostParams,
): number => {
  switch (pricing.kind) {
    case "perSecond":
      return (
        (pricing.baseUsd ?? 0) + pricing.usdPerSecond * params.durationSec!
      );
    case "perMegapixel":
      return pricing.usdPerMegapixel * parseMegapixels(params.imageSize!)!;
    case "perImage":
      // Flat per-image cost. This codebase always generates qty 1
      // (JobCostParams carries no count), so there is no quantity term.
      return pricing.usdPerImage;
  }
};

export const calculateJobCostUsd = (
  modelId: string,
  params: JobCostParams,
): number | null => {
  const model = getModelById(modelId);
  if (!model?.pricing) return null;

  assertValidParams(model, model.pricing, params);

  const cost = priceFromPricing(model.pricing, params);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new InvalidJobParamsError();
  }
  return cost;
};
