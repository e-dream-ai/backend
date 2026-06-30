import {
  isImageGenerationAlgorithm,
  isValidAlgorithm,
  mapAlgorithmToQueue,
} from "utils/prompt.util";

describe("flux-kontext-i2i registration", () => {
  test("is a supported algorithm", () => {
    expect(isValidAlgorithm("flux-kontext-i2i")).toBe(true);
  });

  test("routes to the falimage queue", () => {
    expect(mapAlgorithmToQueue("flux-kontext-i2i")).toBe("falimage");
  });

  test("is classified as an image-generation algorithm", () => {
    expect(isImageGenerationAlgorithm("flux-kontext-i2i")).toBe(true);
  });
});
