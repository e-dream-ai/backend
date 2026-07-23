import { priceFromPricing } from "utils/cost.util";

describe("priceFromPricing", () => {
  test("perImage pricing is a flat per-image cost", () => {
    expect(
      priceFromPricing({ kind: "perImage", usdPerImage: 0.04 }, {}),
    ).toBeCloseTo(0.04);
  });
});
