import { redisClient } from "clients/redis.client";

const TTL = 7200; // 2 hours — enough for any upload to complete

const toNumber = (val: string | null): number | undefined =>
  val ? Number(val) : undefined;

const makeVersionStore = (prefix: string, nx = false) => ({
  set: async (uuid: string): Promise<number> => {
    const key = `upload:version:${prefix}:${uuid}`;
    const version = Date.now();
    if (nx) {
      await redisClient.set(key, version, "EX", TTL, "NX");
      return toNumber(await redisClient.get(key)) ?? version;
    }
    await redisClient.set(key, version, "EX", TTL);
    return version;
  },
  get: (uuid: string) =>
    redisClient.get(`upload:version:${prefix}:${uuid}`).then(toNumber),
  del: (uuid: string) => redisClient.del(`upload:version:${prefix}:${uuid}`),
});

const thumbStore = makeVersionStore("thumb");
const filmstripStore = makeVersionStore("filmstrip", true);
const keyframeStore = makeVersionStore("keyframe");

export const setThumbVersion = thumbStore.set;
export const getThumbVersion = thumbStore.get;
export const delThumbVersion = thumbStore.del;

export const setFilmstripVersion = filmstripStore.set;
export const getFilmstripVersion = filmstripStore.get;
export const clearFilmstripVersion = filmstripStore.del;

export const setKeyframeVersion = keyframeStore.set;
export const getKeyframeVersion = keyframeStore.get;
export const delKeyframeVersion = keyframeStore.del;
