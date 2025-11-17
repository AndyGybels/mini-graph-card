import { LovelaceCardConfig } from "home-assistant-frontend-types";
import { HassEntity, StateChangedEvent } from "home-assistant-js-websocket";
import SparkMD5 from "spark-md5";
import buildConfig from "~/buildConfig";
import { mapToEntityIds } from "~/common/entity/mapper";
import { HistoryStates } from "~/data/history";
import { MiniGraphCardConfig, MiniGraphCardHomeAssistant } from "~/types";

type ConfigCallback = (entityId: string) => void;

export class EntityStore {
  private hass: MiniGraphCardHomeAssistant;

  // configHash → Set<callbacks>
  private configSubscribers = new Map<string, Set<ConfigCallback>>();

  private configMap = new Map<string, LovelaceCardConfig>();

  // entityId → Set<configHashes>
  private entityToConfigs = new Map<string, Set<string>>();

  // entityId → HassEntity (shared across configs)
  private states = new Map<string, HassEntity>();

  // configHash → entityId → history[]
  private histories = new Map<string, Map<string, HistoryStates[0]>>();

  // (configHash + entityId) → loading promise
  private historyLoading = new Map<string, Promise<void>>();

  private unsubWs?: () => void;

  constructor(hass: MiniGraphCardHomeAssistant) {
    this.hass = hass;
  }

  // -------------------------------------------------------------------
  // WebSocket subscription
  // -------------------------------------------------------------------
  private async ensureWs() {
    if (this.unsubWs) return;

    this.unsubWs =
      await this.hass.connection.subscribeEvents<StateChangedEvent>((ev) => {
        const entityId = ev.data.entity_id;
        const newState = ev.data.new_state;
        if (!newState) return;

        if (!this.entityToConfigs.has(entityId)) return;

        // Update shared state
        this.states.set(entityId, newState);

        // Notify all configs that care about this entity
        for (const configHash of this.entityToConfigs.get(entityId)!) {
          const callbacks = this.configSubscribers.get(configHash);
          if (!callbacks) continue;

          for (const cb of callbacks) cb(entityId);
        }
      }, "state_changed");
  }

  private cleanupWs() {
    if (this.entityToConfigs.size === 0 && this.unsubWs) {
      this.unsubWs();
      this.unsubWs = undefined;
    }
  }

  // -------------------------------------------------------------------
  // History loading (per config + per entity)
  // -------------------------------------------------------------------
  private async fetchHistory(
    configHash: string,
    entityId: string,
    hours: number
  ) {
    // Create config-level history bucket
    if (!this.histories.has(configHash)) {
      this.histories.set(configHash, new Map());
    }

    // Prevent duplicate loads
    const key = `${configHash}:${entityId}`;
    if (this.historyLoading.has(key)) return this.historyLoading.get(key);

    if (this.histories.get(configHash)!.has(entityId)) return;

    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);

    const p = (async () => {
      try {
        const result =
          await this.hass.connection.sendMessagePromise<HistoryStates>({
            type: "history/history_during_period",
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            minimal_response: true,
            no_attributes: true,
            entity_ids: [entityId],
          });

        const history = result?.[0] ?? [];

        this.histories.get(configHash)!.set(entityId, history);

        // Notify config that its history is ready
        const callbacks = this.configSubscribers.get(configHash);
        callbacks?.forEach((cb) => cb(entityId));
      } finally {
        this.historyLoading.delete(key);
      }
    })();

    this.historyLoading.set(key, p);
    return p;
  }

  // -------------------------------------------------------------------
  // Subscription API
  // -------------------------------------------------------------------
  async subscribe(config: MiniGraphCardConfig, callback: ConfigCallback) {
    const configHash = SparkMD5.hash(JSON.stringify(config));
    const entities = mapToEntityIds(config.entities || []);

    await this.ensureWs();

    // Register config subscriber
    if (!this.configSubscribers.has(configHash)) {
      this.configSubscribers.set(configHash, new Set());
      this.configMap.set(configHash, buildConfig(config));
    }

    this.configSubscribers.get(configHash)!.add(callback);

    // Register entity → config relationship
    for (const entityId of entities) {
      if (!this.entityToConfigs.has(entityId)) {
        this.entityToConfigs.set(entityId, new Set());
      }
      this.entityToConfigs.get(entityId)!.add(configHash);

      // update initial state
      this.states.set(entityId, this.hass.states[entityId]);

      // load history per config-level
      this.fetchHistory(configHash, entityId, config.hours_to_show ?? 1);
    }

    // initial callback (per entity)
    for (const entityId of entities) callback(entityId);

    // Unsubscribe function
    return {
      configId: configHash,
      unsubscribe: () => {
        // Remove config from entityToConfigs
        for (const entityId of entities) {
          const cfgs = this.entityToConfigs.get(entityId);
          if (!cfgs) continue;

          cfgs.delete(configHash);
          if (cfgs.size === 0) {
            this.entityToConfigs.delete(entityId);
            this.states.delete(entityId);
          }
        }

        // Remove the config subscriber
        const subs = this.configSubscribers.get(configHash);
        subs?.delete(callback);

        if (subs?.size === 0) {
          this.configSubscribers.delete(configHash);
          this.histories.delete(configHash);
        }

        this.cleanupWs();
      },
    };
  }

  // -------------------------------------------------------------------
  // Per-config + per-entity state + history lookup
  // -------------------------------------------------------------------
  getState(configId: string, entityId: string) {
    const haState = this.states.get(entityId) ?? this.hass.states[entityId];

    const history = this.histories.get(configId)?.get(entityId) ?? [];

    return {
      ...haState,
      history,
    };
  }

  getConfig(configId: string) {
    return this.configMap.get(configId);
  }
}
