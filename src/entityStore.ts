import {
  Connection,
  HassEntity,
  StateChangedEvent,
} from "home-assistant-js-websocket";
import { LovelaceCardConfig } from "home-assistant-frontend-types";
import SparkMD5 from "spark-md5";
import buildConfig from "~/buildConfig";
import { getCachedHistory, setCachedHistory } from "~/data/historyCache";
import { log } from "~/utils";
import {
  EntityHistoryState,
  HistoryStates,
  HomeAssistant,
  MiniGraphCardConfig,
} from "~/types";

type ConfigCallback = (entityId: string) => void;

export interface StoreSubscription {
  configId: string;
  unsubscribe(): void;
}

/**
 * Everything the store tracks for one distinct card configuration:
 * the built config, its subscribers, and one history bucket per entity.
 */
class ConfigEntry {
  readonly callbacks = new Set<ConfigCallback>();
  readonly entityIds: string[];
  private readonly histories = new Map<string, EntityHistoryState[]>();
  private readonly loading = new Set<string>();

  constructor(
    readonly configId: string,
    readonly config: MiniGraphCardConfig
  ) {
    this.entityIds = config.entities.map((entity) => entity.entity);
  }

  watches(entityId: string): boolean {
    return this.entityIds.includes(entityId);
  }

  history(entityId: string): EntityHistoryState[] | undefined {
    return this.histories.get(entityId);
  }

  notify(entityId: string): void {
    for (const callback of this.callbacks) callback(entityId);
  }

  /** Append a live state change and drop entries outside the visible window */
  append(entityId: string, item: EntityHistoryState): void {
    const bucket = this.histories.get(entityId);
    if (!bucket) return;

    bucket.push(item);

    const cutoff = Date.now() / 1000 - this.config.hours_to_show * 3600;
    while (bucket.length && (bucket[0].lc ?? bucket[0].lu) < cutoff) {
      bucket.shift();
    }
  }

  /** Drop all history buckets so they get refetched (e.g. after a reconnect) */
  clearHistories(): void {
    this.histories.clear();
  }

  /**
   * Fetch the initial history window for an entity (deduplicated).
   * Cached data is published immediately so the graph paints without
   * waiting on the recorder; the network fetch then tops it up.
   */
  async loadHistory(connection: Connection, entityId: string): Promise<void> {
    if (this.histories.has(entityId) || this.loading.has(entityId)) return;
    this.loading.add(entityId);

    const useCache = this.config.cache !== false;
    const cacheKey = `${entityId}_${this.configId}`;
    const windowStart = new Date(
      Date.now() - this.config.hours_to_show * 3600 * 1000
    );

    let start = windowStart;
    let cachedData: EntityHistoryState[] = [];

    try {
      if (useCache) {
        const cached = await getCachedHistory(cacheKey);
        if (cached && cached.hours_to_show === this.config.hours_to_show) {
          const windowStartSec = windowStart.getTime() / 1000;
          cachedData = cached.data.filter(
            (item) => (item.lc ?? item.lu) >= windowStartSec
          );
          if (cached.last_fetched > start.getTime()) {
            start = new Date(cached.last_fetched);
          }

          // paint the cached window right away
          if (cachedData.length > 0) {
            this.histories.set(entityId, cachedData);
            this.notify(entityId);
          }
        }
      }

      const merged = [
        ...cachedData,
        ...(await this.fetchFresh(connection, entityId, start, cachedData)),
      ];
      this.histories.set(entityId, merged);

      if (useCache) {
        // fire-and-forget: a broken cache must never break the card
        setCachedHistory(cacheKey, {
          hours_to_show: this.config.hours_to_show,
          last_fetched: Date.now(),
          data: merged,
        });
      }
    } catch (err) {
      // don't leave the card on its loading spinner forever: keep whatever
      // we have (cached or nothing); the next reconnect retries the fetch
      log(err);
      if (!this.histories.has(entityId)) this.histories.set(entityId, []);
    } finally {
      this.loading.delete(entityId);
    }
    this.notify(entityId);
  }

  /** Fetch history from `start` and drop items overlapping the cached tail */
  private async fetchFresh(
    connection: Connection,
    entityId: string,
    start: Date,
    cachedData: EntityHistoryState[]
  ): Promise<EntityHistoryState[]> {
    // attribute-based graphs need the full per-state attribute payload
    const needsAttributes = this.config.entities.some(
      (entity) => entity.entity === entityId && entity.attribute
    );

    const result = await connection.sendMessagePromise<HistoryStates>({
      type: "history/history_during_period",
      start_time: start.toISOString(),
      end_time: new Date().toISOString(),
      minimal_response: !needsAttributes,
      no_attributes: !needsAttributes,
      entity_ids: [entityId],
    });

    // the websocket API keys the response by entity id; drop the synthetic
    // boundary state that duplicates the cached tail
    let fresh = result?.[entityId] ?? [];
    const lastCached = cachedData[cachedData.length - 1];
    if (lastCached) {
      const lastCachedTime = lastCached.lc ?? lastCached.lu;
      fresh = fresh.filter((item) => (item.lc ?? item.lu) > lastCachedTime);
    }
    return fresh;
  }
}

// One store per websocket connection. The hass object itself is replaced by
// the HA frontend on every state change, so it can't be used as the key.
const stores = new WeakMap<Connection, EntityStore>();

export function getEntityStore(hass: HomeAssistant): EntityStore {
  let store = stores.get(hass.connection);
  if (!store) {
    store = new EntityStore(hass);
    stores.set(hass.connection, store);
  }
  store.hass = hass;
  return store;
}

/**
 * Shared entity/history store backing all mini-graph-card instances on a
 * connection: a single `state_changed` subscription fans out to every card,
 * and history is fetched once per (config, entity) and kept current by
 * appending live state changes.
 */
export class EntityStore {
  hass: HomeAssistant;

  // configId (hash of the raw config) → per-config record
  private readonly entries = new Map<string, ConfigEntry>();

  // entityId → latest HassEntity (shared across configs)
  private readonly states = new Map<string, HassEntity>();

  private wsSubscription?: Promise<() => void>;
  private unsubWs?: () => void;

  constructor(hass: HomeAssistant) {
    this.hass = hass;
  }

  async subscribe(
    config: LovelaceCardConfig,
    callback: ConfigCallback
  ): Promise<StoreSubscription> {
    const configId = SparkMD5.hash(JSON.stringify(config));

    await this.ensureWs();

    let entry = this.entries.get(configId);
    if (!entry) {
      entry = new ConfigEntry(configId, buildConfig(config));
      this.entries.set(configId, entry);
    }
    entry.callbacks.add(callback);

    for (const entityId of entry.entityIds) {
      if (this.hass.states[entityId]) {
        this.states.set(entityId, this.hass.states[entityId]);
      }
      entry.loadHistory(this.hass.connection, entityId);
      callback(entityId); // deliver the initial state
    }

    return {
      configId,
      unsubscribe: () => this.unsubscribe(configId, callback),
    };
  }

  getState(configId: string, entityId: string) {
    const haState = this.states.get(entityId) ?? this.hass.states[entityId];
    const history = this.entries.get(configId)?.history(entityId);

    return {
      ...haState,
      history: history ?? [],
      historyLoaded: history !== undefined,
    };
  }

  getConfig(configId: string): MiniGraphCardConfig | undefined {
    return this.entries.get(configId)?.config;
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------
  private unsubscribe(configId: string, callback: ConfigCallback): void {
    const entry = this.entries.get(configId);
    if (!entry) return;

    entry.callbacks.delete(callback);
    if (entry.callbacks.size > 0) return;

    // last subscriber for this config left → drop it and prune orphans
    this.entries.delete(configId);

    for (const entityId of entry.entityIds) {
      if (!this.someEntryWatches(entityId)) this.states.delete(entityId);
    }

    if (this.entries.size === 0) {
      if (this.unsubWs) {
        this.unsubWs();
      } else {
        // subscription still in flight → release it once established
        this.wsSubscription?.then((unsubscribe) => unsubscribe()).catch(() => {});
      }
      this.unsubWs = undefined;
      this.wsSubscription = undefined;
      this.hass.connection.removeEventListener("ready", this.onReady);
    }
  }

  private someEntryWatches(entityId: string): boolean {
    for (const entry of this.entries.values()) {
      if (entry.watches(entityId)) return true;
    }
    return false;
  }

  private ensureWs(): Promise<() => void> {
    // stash the promise so concurrent subscribers share one subscription
    if (!this.wsSubscription) {
      this.wsSubscription = this.hass.connection
        .subscribeEvents<StateChangedEvent>(
          (ev) => this.onStateChanged(ev),
          "state_changed"
        )
        .then((unsubscribe) => {
          this.unsubWs = unsubscribe;
          // events missed while offline are gone → refetch on reconnect
          this.hass.connection.addEventListener("ready", this.onReady);
          return unsubscribe;
        })
        .catch((err) => {
          // clear the cached rejection so a later subscriber retries
          this.wsSubscription = undefined;
          throw err;
        });
    }
    return this.wsSubscription;
  }

  /** Reconnect: recorded data may have moved on while we were offline */
  private readonly onReady = () => {
    for (const entry of this.entries.values()) {
      entry.clearHistories();
      for (const entityId of entry.entityIds) {
        entry.loadHistory(this.hass.connection, entityId);
      }
    }
  };

  private onStateChanged(ev: StateChangedEvent): void {
    const { entity_id: entityId, new_state: newState } = ev.data;
    if (!newState) return;

    const watchers: ConfigEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.watches(entityId)) watchers.push(entry);
    }
    if (watchers.length === 0) return;

    this.states.set(entityId, newState);

    const item: EntityHistoryState = {
      s: newState.state,
      a: {},
      lu: new Date(newState.last_updated).getTime() / 1000,
      lc: new Date(newState.last_changed).getTime() / 1000,
    };

    for (const entry of watchers) {
      entry.append(entityId, item);
      entry.notify(entityId);
    }
  }
}
