/**
 * History cache tests (IndexedDB via localforage, mocked in-memory)
 */

const memory = new Map<string, any>();

jest.mock("idb-keyval", () => ({
  createStore: () => ({}),
  get: async (key: string) => memory.get(key),
  set: async (key: string, value: any) => {
    memory.set(key, value);
  },
  del: async (key: string) => {
    memory.delete(key);
  },
  entries: async () => [...memory.entries()],
}));

import {
  getCachedHistory,
  setCachedHistory,
  purgeStaleCache,
} from "../src/data/historyCache";
import { version } from "../package.json";

beforeEach(() => memory.clear());

describe("historyCache", () => {
  test("returns undefined for a missing key", async () => {
    expect(await getCachedHistory("nope")).toBeUndefined();
  });

  test("round-trips cached history", async () => {
    await setCachedHistory("sensor.a_abc", {
      hours_to_show: 24,
      last_fetched: Date.now(),
      data: [{ s: "10", a: {}, lu: 1 }],
    });

    const cached = await getCachedHistory("sensor.a_abc");
    expect(cached?.data.map((item) => item.s)).toEqual(["10"]);
    expect(cached?.version).toBe(version);
  });

  test("rejects entries written by a different card version", async () => {
    memory.set("sensor.a_abc", {
      version: "0.0.1",
      hours_to_show: 24,
      last_fetched: Date.now(),
      data: [],
    });

    expect(await getCachedHistory("sensor.a_abc")).toBeUndefined();
  });

  test("purges version-mismatched and expired entries, keeps fresh ones", async () => {
    const now = Date.now();
    memory.set("old-version", {
      version: "0.0.1",
      hours_to_show: 24,
      last_fetched: now,
      data: [],
    });
    memory.set("expired", {
      version,
      hours_to_show: 2,
      last_fetched: now - 3 * 3600 * 1000, // older than its own 2h window
      data: [],
    });
    memory.set("fresh", {
      version,
      hours_to_show: 24,
      last_fetched: now - 60 * 1000,
      data: [],
    });

    await purgeStaleCache();

    expect([...memory.keys()]).toEqual(["fresh"]);
  });
});
