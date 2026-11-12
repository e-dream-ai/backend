import { getModelCatalog } from "constants/models.constants";
import { DreamMediaType } from "types/dream.types";
import {
  calculateJobCostUsd,
  InvalidJobParamsError,
  priceFromPricing,
} from "utils/cost.util";

describe("priceFromPricing", () => {
  test("perImage pricing is a flat per-image cost", () => {
    expect(
      priceFromPricing({ kind: "perImage", usdPerImage: 0.04 }, {}),
    ).toBeCloseTo(0.04);
  });
});

describe.each([
  ["krea-2-turbo", 0.0073728],
  ["krea-2-turbo-style", 0.009216],
] as const)(
  "%s catalog and pricing",
  (algorithm: string, landscapeCost: number) => {
    test("is discoverable as a fal image model without steps or negative prompts", () => {
      expect(getModelCatalog(DreamMediaType.IMAGE)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: algorithm,
            provider: "fal",
            constraints: expect.objectContaining({
              supportsSteps: false,
              supportsNegativePrompt: false,
            }),
          }),
        ]),
      );
      expect(
        getModelCatalog(DreamMediaType.VIDEO).some(
          (model) => model.id === algorithm,
        ),
      ).toBe(false);
    });

    test("charges for the requested output area", () => {
      expect(
        calculateJobCostUsd(algorithm, { imageSize: "1280*720" }),
      ).toBeCloseTo(landscapeCost, 8);
    });

    test.each([undefined, "bad-size", "0*1024", "100000*100000"])(
      "rejects missing or unsupported size %s",
      (imageSize) => {
        expect(() => calculateJobCostUsd(algorithm, { imageSize })).toThrow(
          InvalidJobParamsError,
        );
      },
    );
  },
);

describe("krea-2-large catalog and pricing", () => {
  test("offers Krea's creativity levels, default medium", () => {
    expect(getModelCatalog(DreamMediaType.IMAGE)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "krea-2-large",
          provider: "fal",
          constraints: expect.objectContaining({
            supportsSteps: false,
            supportsNegativePrompt: false,
            creativity: {
              options: ["raw", "low", "medium", "high"],
              default: "medium",
            },
          }),
        }),
      ]),
    );
  });

  test.each(["1280*720", "1024*1024", "1280*544"])(
    "charges a flat price per image at %s",
    (imageSize) => {
      expect(calculateJobCostUsd("krea-2-large", { imageSize })).toBeCloseTo(
        0.06,
        8,
      );
    },
  );

  test("charges the flat price when no size is given", () => {
    expect(calculateJobCostUsd("krea-2-large", {})).toBeCloseTo(0.06, 8);
  });

  test.each(["768*1024", "bad-size"])(
    "rejects a size that is not one of its aspect ratios (%s)",
    (imageSize) => {
      expect(() => calculateJobCostUsd("krea-2-large", { imageSize })).toThrow(
        InvalidJobParamsError,
      );
    },
  );

  test("leaves sizes alone for a flat-priced model without a size list", () => {
    expect(
      calculateJobCostUsd("flux-kontext-i2i", { imageSize: "123*456" }),
    ).toBeCloseTo(0.04, 8);
  });
});
