import type { Dream } from "entities/Dream.entity";

describe("transform.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("collects keys and applies signed urls immutably for dream", async () => {
    await jest.isolateModulesAsync(async () => {
      const dream = {
        video: "u/d/d.mp4",
        original_video: "u/d/o.mp4",
        thumbnail: "u/d/t.jpg",
        filmstrip: [
          { frameNumber: 1, url: "u/d/filmstrip/frame-1.jpg" },
          { frameNumber: 2, url: "u/d/filmstrip/frame-2.jpg" },
        ],
        user: { avatar: "u/a.jpg" },
      } as Record<string, unknown>;

      const signed: Record<string, string> = {
        "u/d/d.mp4": "S1",
        "u/d/o.mp4": "S2",
        "u/d/t.jpg": "S3",
        "u/d/filmstrip/frame-1.jpg": "F1",
        "u/d/filmstrip/frame-2.jpg": "F2",
        "u/a.jpg": "A1",
      };

      const presigned = jest.fn().mockResolvedValue(signed);
      jest.doMock("clients/presign.client", () => ({
        __esModule: true,
        presignClient: { generatePresignedUrls: presigned },
      }));

      const { transformDreamWithSignedUrls } = await import(
        "utils/transform.util"
      );
      const out = await transformDreamWithSignedUrls(dream as unknown as Dream);

      expect(out).not.toBe(dream);
      expect(out.video).toBe("S1");
      expect(out.original_video).toBe("S2");
      expect(out.thumbnail).toBe("S3");
      const fs0 = out.filmstrip[0] as unknown as { url?: string };
      const fs1 = out.filmstrip[1] as unknown as { url?: string };
      expect(fs0.url).toBe("F1");
      expect(fs1.url).toBe("F2");
      expect(out.user.avatar).toBe("A1");
    });
  });

  it("returns entity unchanged when no keys to sign", async () => {
    await jest.isolateModulesAsync(async () => {
      const dream = { name: "no urls" } as Record<string, unknown>;
      const presigned = jest.fn();
      jest.doMock("clients/presign.client", () => ({
        __esModule: true,
        presignClient: { generatePresignedUrls: presigned },
      }));

      const { transformDreamWithSignedUrls } = await import(
        "utils/transform.util"
      );
      const out = await transformDreamWithSignedUrls(dream as unknown as Dream);
      expect(out).toBe(dream);
      expect(presigned).not.toHaveBeenCalled();
    });
  });

  it("transformEntities batches unique keys and maps results", async () => {
    await jest.isolateModulesAsync(async () => {
      const dreams = [
        { video: "k1", thumbnail: "t1", user: { avatar: "a1" } },
        { video: "k2", thumbnail: "t2", user: { avatar: "a2" } },
      ] as Array<Record<string, unknown>>;

      const mapping: Record<string, string> = {
        k1: "K1",
        t1: "T1",
        a1: "A1",
        k2: "K2",
        t2: "T2",
        a2: "A2",
      };

      const presigned = jest.fn().mockResolvedValue(mapping);
      jest.doMock("clients/presign.client", () => ({
        __esModule: true,
        presignClient: { generatePresignedUrls: presigned },
      }));

      const { transformDreamsWithSignedUrls } = await import(
        "utils/transform.util"
      );
      const out = await transformDreamsWithSignedUrls(
        dreams as unknown as Dream[],
      );
      expect(presigned).toHaveBeenCalledWith([
        "k1",
        "t1",
        "a1",
        "k2",
        "t2",
        "a2",
      ]);
      expect(out[0].video).toBe("K1");
      expect(out[1].thumbnail).toBe("T2");
    });
  });

  it("TransformSession.executeBatch aggregates partial failures", async () => {
    await jest.isolateModulesAsync(async () => {
      const calls: Array<"fail" | "ok"> = ["fail", "ok"];
      const presigned = jest
        .fn()
        .mockImplementation(async (batch: string[]) => {
          const mode = calls.shift();
          if (mode === "fail") throw new Error("x");
          return Object.fromEntries(batch.map((k) => [k, k.toUpperCase()]));
        });

      jest.doMock("clients/presign.client", () => ({
        __esModule: true,
        presignClient: { generatePresignedUrls: presigned },
      }));

      const ce = jest.spyOn(console, "error").mockImplementation(() => {});
      const cw = jest.spyOn(console, "warn").mockImplementation(() => {});

      const { TransformSession } = await import("utils/transform.util");
      const session = new TransformSession();
      for (let i = 0; i < 600; i++) session["allKeys"].add(`k${i}`);

      const signed = await session.executeBatch();
      expect(Object.keys(signed).length).toBeGreaterThan(0);

      ce.mockRestore();
      cw.mockRestore();
    });
  });
});
