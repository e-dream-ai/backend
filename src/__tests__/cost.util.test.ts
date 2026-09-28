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
