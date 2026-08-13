import { createStore, del, entries, get, set } from "idb-keyval";
import { version } from "../../package.json";
import { EntityHistoryState } from "~/types";
import { log } from "~/utils";

/**
 * Client-side history cache (IndexedDB): lets a reloaded dashboard fetch
 * only the delta since `last_fetched` instead of the whole window.
 */
export interface CachedHistory {
  version: string;
  hours_to_show: number;
  /** epoch milliseconds of the fetch that wrote this entry */
  last_fetched: number;
  data: EntityHistoryState[];
}

const store = createStore("mini-graph-card", "entity_history_cache");

export async function getCachedHistory(
  key: string
): Promise<CachedHistory | undefined> {
  try {
    const cached = await get<CachedHistory>(key, store);
    if (!cached || cached.version !== version) return undefined;
    return cached;
  } catch (err) {
    log(err);
    return undefined;
  }
}

export async function setCachedHistory(
  key: string,
  entry: Omit<CachedHistory, "version">
): Promise<void> {
  try {
    await set(key, { ...entry, version }, store);
  } catch (err) {
    // a full or broken cache must never break the card
    log(err);
  }
}

/** Remove entries from other card versions or older than their own window */
export async function purgeStaleCache(): Promise<void> {
  try {
    const all = await entries<string, CachedHistory>(store);
    const stale = all.filter(([, value]) => {
      const expired =
        value.last_fetched < Date.now() - value.hours_to_show * 3600 * 1000;
      return value.version !== version || expired;
    });
    await Promise.all(stale.map(([key]) => del(key, store)));
  } catch (err) {
    log(err);
  }
}
