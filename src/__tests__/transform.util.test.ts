import type { Dream } from "entities/Dream.entity";
import { createHmac } from "crypto";

const WORKER_URL = "https://worker.example.com";
const SIGNING_SECRET = "test-signing-secret";

function expectedUrl(key: string): string {
  const sig = createHmac("sha256", SIGNING_SECRET).update(key).digest("hex");
  return `${WORKER_URL}/${key}?sig=${sig}`;
}

describe("transform.util", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("collects keys and applies signed urls immutably for dream", async () => {
    const { transformDreamWithSignedUrls } = await import(
      "utils/transform.util"
    );

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

    const out = await transformDreamWithSignedUrls(dream as unknown as Dream);

    expect(out).not.toBe(dream);
    expect(out.video).toBe(expectedUrl("u/d/d.mp4"));
    expect(out.original_video).toBe(expectedUrl("u/d/o.mp4"));
    expect(out.thumbnail).toBe(expectedUrl("u/d/t.jpg"));
    const fs0 = out.filmstrip[0] as unknown as { url?: string };
    const fs1 = out.filmstrip[1] as unknown as { url?: string };
    expect(fs0.url).toBe(expectedUrl("u/d/filmstrip/frame-1.jpg"));
    expect(fs1.url).toBe(expectedUrl("u/d/filmstrip/frame-2.jpg"));
    expect(out.user.avatar).toBe(expectedUrl("u/a.jpg"));
  });

  it("returns entity unchanged when no keys to sign", async () => {
    const { transformDreamWithSignedUrls } = await import(
      "utils/transform.util"
    );

    const dream = { name: "no urls" } as Record<string, unknown>;
    const out = await transformDreamWithSignedUrls(dream as unknown as Dream);
    expect(out).toBe(dream);
  });

  it("transformEntities batches unique keys and maps results", async () => {
    const { transformDreamsWithSignedUrls } = await import(
      "utils/transform.util"
    );

    const dreams = [
      { video: "k1", thumbnail: "t1", user: { avatar: "a1" } },
      { video: "k2", thumbnail: "t2", user: { avatar: "a2" } },
    ] as Array<Record<string, unknown>>;

    const out = await transformDreamsWithSignedUrls(
      dreams as unknown as Dream[],
    );
    expect(out[0].video).toBe(expectedUrl("k1"));
    expect(out[0].thumbnail).toBe(expectedUrl("t1"));
    expect(out[1].video).toBe(expectedUrl("k2"));
    expect(out[1].thumbnail).toBe(expectedUrl("t2"));
  });

  it("TransformSession.executeBatch generates signed urls for all keys", async () => {
    const { TransformSession } = await import("utils/transform.util");
    const session = new TransformSession();

    session["allKeys"].add("key1");
    session["allKeys"].add("key2");
    session["allKeys"].add("key3");

    const signed = await session.executeBatch();
    expect(Object.keys(signed)).toHaveLength(3);
    expect(signed["key1"]).toBe(expectedUrl("key1"));
    expect(signed["key2"]).toBe(expectedUrl("key2"));
    expect(signed["key3"]).toBe(expectedUrl("key3"));
  });
});
