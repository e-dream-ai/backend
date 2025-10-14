describe("r2.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("generates paths correctly", async () => {
    const {
      generateThumbnailPath,
      generateFilmstripPath,
      generateDreamPath,
      generateKeyframePath,
    } = await import("utils/r2.util");

    expect(
      generateThumbnailPath({
        userIdentifier: "u",
        dreamUUID: "d",
        extension: "jpg",
      }),
    ).toBe("u/d/thumbnails/d.jpg");

    expect(
      generateFilmstripPath({
        userIdentifier: "u",
        dreamUUID: "d",
        extension: "png",
        frameNumber: 5,
      }),
    ).toBe("u/d/filmstrip/frame-5.png");

    expect(
      generateDreamPath({
        userIdentifier: "u",
        dreamUUID: "d",
        extension: "mp4",
      }),
    ).toBe("u/d/d.mp4");

    expect(
      generateDreamPath({
        userIdentifier: "u",
        dreamUUID: "d",
        extension: "mp4",
        processed: true,
      }),
    ).toBe("u/d/d_processed.mp4");

    expect(
      generateKeyframePath({
        userIdentifier: "u",
        keyframeUUID: "k",
        extension: "jpg",
      }),
    ).toBe("u/keyframes/k/k.jpg");
  });

  it("getMimeTypeFromPath resolves via extension", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("constants/file.constants", () => ({
        __esModule: true,
        getMimeTypeFromExtension: (ext: string) =>
          (({ mp4: "video/mp4", jpg: "image/jpeg" }) as Record<string, string>)[
            ext
          ] ?? "application/octet-stream",
      }));

      const { getMimeTypeFromPath } = await import("utils/r2.util");
      expect(getMimeTypeFromPath("/a/b/c.mp4")).toBe("video/mp4");
      expect(getMimeTypeFromPath("thumb.jpg")).toBe("image/jpeg");
      expect(getMimeTypeFromPath("unknown.bin")).toBe(
        "application/octet-stream",
      );
    });
  });

  it("createMultipartUpload forwards to r2 client with content type", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("shared/env", () => ({
        __esModule: true,
        default: { R2_BUCKET_NAME: "bucket" },
        env: { R2_BUCKET_NAME: "bucket" },
      }));
      const send = jest.fn().mockResolvedValue({ UploadId: "id" });
      jest.mock("clients/r2.client", () => ({
        __esModule: true,
        r2Client: { send },
      }));
      jest.mock("constants/file.constants", () => ({
        __esModule: true,
        getMimeTypeFromExtension: () => "video/mp4",
      }));

      const { createMultipartUpload } = await import("utils/r2.util");
      const uploadId = await createMultipartUpload("u/d/d.mp4");

      expect(uploadId).toBe("id");
      expect(send).toHaveBeenCalled();
    });
  });

  it("getUploadPartSignedUrl uses getSignedUrl", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.mock("shared/env", () => ({
        __esModule: true,
        default: { R2_BUCKET_NAME: "b" },
        env: { R2_BUCKET_NAME: "b" },
      }));
      const signed = "https://signed";
      const getSignedUrl = jest.fn().mockResolvedValue(signed);
      jest.mock("@aws-sdk/s3-request-presigner", () => ({
        __esModule: true,
        getSignedUrl,
      }));
      jest.mock("clients/r2.client", () => ({
        __esModule: true,
        r2Client: {},
      }));

      const { getUploadPartSignedUrl } = await import("utils/r2.util");
      const url = await getUploadPartSignedUrl("key", "up", 1);

      expect(url).toBe(signed);
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });
});
