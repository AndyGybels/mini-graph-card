/**
 * EntityStore Test Suite
 *
 * Tests for the shared websocket-backed entity/history store.
 */

jest.mock("../src/data/historyCache", () => ({
  getCachedHistory: jest.fn(async () => undefined),
  setCachedHistory: jest.fn(async () => {}),
  purgeStaleCache: jest.fn(async () => {}),
}));

import { EntityStore, getEntityStore } from "../src/entityStore";
import {
  getCachedHistory,
  setCachedHistory,
} from "../src/data/historyCache";

const mockedGetCache = getCachedHistory as jest.MockedFunction<
  typeof getCachedHistory
>;
const mockedSetCache = setCachedHistory as jest.MockedFunction<
  typeof setCachedHistory
>;

beforeEach(() => {
  mockedGetCache.mockReset().mockResolvedValue(undefined);
  mockedSetCache.mockReset().mockResolvedValue(undefined);
});

const ENTITY = "sensor.test_temperature";

function makeHass({
  history,
  failFetches = 0,
  failSubscribes = 0,
}: {
  history?: Record<string, any[]>;
  /** number of initial history fetches that reject */
  failFetches?: number;
  /** number of initial subscribeEvents calls that reject */
  failSubscribes?: number;
} = {}) {
  const eventListeners: Array<(ev: any) => void> = [];
  const readyListeners: Array<() => void> = [];
  const unsubscribe = jest.fn();
  const sentMessages: any[] = [];
  const currentHistory = { value: history };
  let fetchFailuresLeft = failFetches;
  let subscribeFailuresLeft = failSubscribes;

  const hass: any = {
    states: {
      [ENTITY]: {
        entity_id: ENTITY,
        state: "21.5",
        attributes: { unit_of_measurement: "°C" },
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
    },
    locale: { language: "en" },
    connection: {
      subscribeEvents: jest.fn(async (cb: (ev: any) => void) => {
        if (subscribeFailuresLeft > 0) {
          subscribeFailuresLeft -= 1;
          throw new Error("subscribe failed");
        }
        eventListeners.push(cb);
        return unsubscribe;
      }),
      sendMessagePromise: jest.fn(async (msg: any) => {
        sentMessages.push(msg);
        if (msg.type === "history/history_during_period") {
          if (fetchFailuresLeft > 0) {
            fetchFailuresLeft -= 1;
            throw new Error("fetch failed");
          }
          return currentHistory.value ?? { [ENTITY]: [] };
        }
        return null;
      }),
      addEventListener: jest.fn((event: string, cb: () => void) => {
        if (event === "ready") readyListeners.push(cb);
      }),
      removeEventListener: jest.fn((event: string, cb: () => void) => {
        if (event === "ready") {
          const i = readyListeners.indexOf(cb);
          if (i > -1) readyListeners.splice(i, 1);
        }
      }),
    },
  };

  return {
    hass,
    eventListeners,
    readyListeners,
    unsubscribe,
    sentMessages,
    currentHistory,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("EntityStore", () => {
  test("stores history from the entity-id-keyed websocket response", async () => {
    const nowSec = Date.now() / 1000;
    const items = [
      { s: "10", a: {}, lu: nowSec - 7200 },
      { s: "20", a: {}, lu: nowSec - 3600 },
    ];
    const { hass } = makeHass({ history: { [ENTITY]: items } });
    const store = new EntityStore(hass);

    const { configId } = await store.subscribe(
      { entities: [ENTITY] } as any,
      () => {}
    );
    await flush();

    expect(store.getState(configId, ENTITY).history).toEqual(items);
  });

  test("fetches the built-config default window of 24 hours when hours_to_show is not set", async () => {
    const { hass, sentMessages } = makeHass();
    const store = new EntityStore(hass);

    await store.subscribe({ entities: [ENTITY] } as any, () => {});
    await flush();

    const msg = sentMessages.find(
      (m) => m.type === "history/history_during_period"
    );
    expect(msg).toBeDefined();
    const windowMs =
      new Date(msg.end_time).getTime() - new Date(msg.start_time).getTime();
    expect(windowMs).toBe(24 * 3600 * 1000);
  });

  test("appends state_changed events to history and notifies subscribers", async () => {
    const nowSec = Date.now() / 1000;
    const { hass, eventListeners } = makeHass({
      history: { [ENTITY]: [{ s: "10", a: {}, lu: nowSec - 3600 }] },
    });
    const store = new EntityStore(hass);

    const callback = jest.fn();
    const { configId } = await store.subscribe(
      { entities: [ENTITY] } as any,
      callback
    );
    await flush();
    callback.mockClear();

    const changedAt = new Date();
    eventListeners.forEach((cb) =>
      cb({
        data: {
          entity_id: ENTITY,
          new_state: {
            entity_id: ENTITY,
            state: "25.0",
            attributes: {},
            last_changed: changedAt.toISOString(),
            last_updated: changedAt.toISOString(),
          },
        },
      })
    );

    const { history } = store.getState(configId, ENTITY);
    expect(history[history.length - 1].s).toBe("25.0");
    expect(history[history.length - 1].lu).toBeCloseTo(
      changedAt.getTime() / 1000,
      0
    );
    expect(callback).toHaveBeenCalledWith(ENTITY);
  });

  test("trims history entries that fall outside the hours_to_show window", async () => {
    const nowSec = Date.now() / 1000;
    const { hass, eventListeners } = makeHass({
      history: {
        [ENTITY]: [
          { s: "1", a: {}, lu: nowSec - 3 * 3600 }, // outside 2h window
          { s: "10", a: {}, lu: nowSec - 3600 },
        ],
      },
    });
    const store = new EntityStore(hass);

    const { configId } = await store.subscribe(
      { entities: [ENTITY], hours_to_show: 2 } as any,
      () => {}
    );
    await flush();

    eventListeners.forEach((cb) =>
      cb({
        data: {
          entity_id: ENTITY,
          new_state: {
            entity_id: ENTITY,
            state: "25.0",
            attributes: {},
            last_changed: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          },
        },
      })
    );

    const { history } = store.getState(configId, ENTITY);
    expect(history.map((item: any) => item.s)).toEqual(["10", "25.0"]);
  });

  test("unsubscribes from the websocket when the last card unsubscribes", async () => {
    const { hass, unsubscribe } = makeHass();
    const store = new EntityStore(hass);

    const sub = await store.subscribe({ entities: [ENTITY] } as any, () => {});
    await flush();
    sub.unsubscribe();

    expect(unsubscribe).toHaveBeenCalled();
  });

  test("marks history as loaded (empty) when the fetch fails, instead of loading forever", async () => {
    const { hass } = makeHass({ failFetches: 1 });
    const store = new EntityStore(hass);

    const callback = jest.fn();
    const { configId } = await store.subscribe(
      { entities: [ENTITY] } as any,
      callback
    );
    await flush();

    const state = store.getState(configId, ENTITY);
    expect(state.historyLoaded).toBe(true);
    expect(state.history).toEqual([]);
    expect(callback).toHaveBeenCalledWith(ENTITY);
  });

  test("retries the websocket subscription after a failure", async () => {
    const { hass } = makeHass({ failSubscribes: 1 });
    const store = new EntityStore(hass);

    await expect(
      store.subscribe({ entities: [ENTITY] } as any, () => {})
    ).rejects.toThrow("subscribe failed");

    // a later subscriber must get a fresh attempt, not the cached rejection
    const sub = await store.subscribe({ entities: [ENTITY] } as any, () => {});
    expect(sub.configId).toBeDefined();
    expect(hass.connection.subscribeEvents).toHaveBeenCalledTimes(2);
  });

  test("refetches history when the connection reconnects (ready event)", async () => {
    const nowSec = Date.now() / 1000;
    const { hass, readyListeners, currentHistory } = makeHass({
      history: { [ENTITY]: [{ s: "10", a: {}, lu: nowSec - 3600 }] },
    });
    const store = new EntityStore(hass);

    const { configId } = await store.subscribe(
      { entities: [ENTITY] } as any,
      () => {}
    );
    await flush();
    expect(store.getState(configId, ENTITY).history.map((i: any) => i.s)).toEqual(
      ["10"]
    );

    // connection dropped and came back with new data recorded server-side
    currentHistory.value = {
      [ENTITY]: [
        { s: "10", a: {}, lu: nowSec - 3600 },
        { s: "42", a: {}, lu: nowSec - 60 },
      ],
    };
    readyListeners.forEach((cb) => cb());
    await flush();

    expect(store.getState(configId, ENTITY).history.map((i: any) => i.s)).toEqual(
      ["10", "42"]
    );
  });

  test("removes the ready listener when the last card unsubscribes", async () => {
    const { hass } = makeHass();
    const store = new EntityStore(hass);

    const sub = await store.subscribe({ entities: [ENTITY] } as any, () => {});
    await flush();
    sub.unsubscribe();

    expect(hass.connection.removeEventListener).toHaveBeenCalledWith(
      "ready",
      expect.any(Function)
    );
  });

  describe("history caching", () => {
    test("fetches only the delta when the cached window matches", async () => {
      const nowSec = Date.now() / 1000;
      const lastFetched = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      mockedGetCache.mockResolvedValue({
        version: "x",
        hours_to_show: 24,
        last_fetched: lastFetched,
        data: [{ s: "10", a: {}, lu: nowSec - 3600 }],
      });
      const { hass, sentMessages } = makeHass({
        history: {
          [ENTITY]: [
            { s: "10", a: {}, lu: nowSec - 3600 }, // boundary duplicate
            { s: "20", a: {}, lu: nowSec - 60 },
          ],
        },
      });
      const store = new EntityStore(hass);

      const { configId } = await store.subscribe(
        { entities: [ENTITY] } as any,
        () => {}
      );
      await flush();

      const msg = sentMessages.find(
        (m) => m.type === "history/history_during_period"
      );
      expect(new Date(msg.start_time).getTime()).toBe(lastFetched);
      expect(
        store.getState(configId, ENTITY).history.map((item: any) => item.s)
      ).toEqual(["10", "20"]);
    });

    test("ignores the cache when hours_to_show differs", async () => {
      mockedGetCache.mockResolvedValue({
        version: "x",
        hours_to_show: 2,
        last_fetched: Date.now() - 60 * 1000,
        data: [{ s: "99", a: {}, lu: Date.now() / 1000 - 30 }],
      });
      const { hass, sentMessages } = makeHass();
      const store = new EntityStore(hass);

      await store.subscribe(
        { entities: [ENTITY], hours_to_show: 24 } as any,
        () => {}
      );
      await flush();

      const msg = sentMessages.find(
        (m) => m.type === "history/history_during_period"
      );
      const windowMs =
        new Date(msg.end_time).getTime() - new Date(msg.start_time).getTime();
      expect(windowMs).toBe(24 * 3600 * 1000);
    });

    test("writes the merged window back to the cache", async () => {
      const nowSec = Date.now() / 1000;
      const { hass } = makeHass({
        history: { [ENTITY]: [{ s: "20", a: {}, lu: nowSec - 60 }] },
      });
      const store = new EntityStore(hass);

      await store.subscribe({ entities: [ENTITY] } as any, () => {});
      await flush();

      expect(mockedSetCache).toHaveBeenCalledWith(
        expect.stringContaining(ENTITY),
        expect.objectContaining({
          hours_to_show: 24,
          data: [{ s: "20", a: {}, lu: nowSec - 60 }],
        })
      );
    });

    test("serves cached history immediately, before the delta fetch resolves", async () => {
      const nowSec = Date.now() / 1000;
      mockedGetCache.mockResolvedValue({
        version: "x",
        hours_to_show: 24,
        last_fetched: Date.now() - 10 * 60 * 1000,
        data: [{ s: "10", a: {}, lu: nowSec - 3600 }],
      });

      // a delta fetch that never resolves during this test (slow recorder)
      const { hass } = makeHass();
      hass.connection.sendMessagePromise = jest.fn(
        () => new Promise(() => {})
      );
      const store = new EntityStore(hass);

      const { configId } = await store.subscribe(
        { entities: [ENTITY] } as any,
        () => {}
      );
      await flush();

      const state = store.getState(configId, ENTITY);
      expect(state.historyLoaded).toBe(true);
      expect(state.history.map((item: any) => item.s)).toEqual(["10"]);
    });

    test("skips the cache when disabled in the config", async () => {
      const { hass } = makeHass();
      const store = new EntityStore(hass);

      await store.subscribe(
        { entities: [ENTITY], cache: false } as any,
        () => {}
      );
      await flush();

      expect(mockedGetCache).not.toHaveBeenCalled();
      expect(mockedSetCache).not.toHaveBeenCalled();
    });
  });
});

describe("getEntityStore", () => {
  test("returns the same store for hass objects sharing a connection", () => {
    const { hass } = makeHass();
    const hassClone = { ...hass };

    const a = getEntityStore(hass);
    const b = getEntityStore(hassClone);

    expect(a).toBe(b);
    expect(a).toBeInstanceOf(EntityStore);
  });

  test("keeps the store's hass reference up to date", () => {
    const { hass } = makeHass();
    const store = getEntityStore(hass);

    const hassClone = { ...hass, states: { changed: true } };
    getEntityStore(hassClone);

    expect((store as any).hass).toBe(hassClone);
  });
});
