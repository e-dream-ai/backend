import {
  isImageGenerationAlgorithm,
  isValidAlgorithm,
  mapAlgorithmToQueue,
} from "utils/prompt.util";

describe.each(["flux-kontext-i2i", "krea-2-turbo", "krea-2-turbo-style"])(
  "%s registration",
  (algorithm) => {
    test("is a supported algorithm", () => {
      expect(isValidAlgorithm(algorithm)).toBe(true);
    });

    test("routes to the falimage queue", () => {
      expect(mapAlgorithmToQueue(algorithm)).toBe("falimage");
    });

    test("is classified as an image-generation algorithm", () => {
      expect(isImageGenerationAlgorithm(algorithm)).toBe(true);
    });
  },
);
