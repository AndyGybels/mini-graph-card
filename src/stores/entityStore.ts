import { HassEntity, StateChangedEvent } from "home-assistant-js-websocket";
import { HistoryStates } from "~/data/history";
import { MiniGraphCardConfig, MiniGraphCardHomeAssistant } from "~/types";

export class EntityStore {
  private hass: MiniGraphCardHomeAssistant;

  private subscribers = new Map<string, Set<() => void>>();
  private states = new Map<string, HassEntity>();
  private histories = new Map<string, HistoryStates[0]>();

  private historyLoading = new Map<string, Promise<void>>();
  private interestCount = new Map<string, number>();

  private unsub?: () => void;

  constructor(hass: MiniGraphCardHomeAssistant) {
    this.hass = hass;
  }

  async loadInitial(entityIds: string[]) {
    for (const id of entityIds) {
      this.states.set(id, this.hass.states[id]);
    }
  }

  private async ensureWsSubscription() {
    if (this.unsub) return;

    this.unsub = await this.hass.connection.subscribeEvents<StateChangedEvent>(
      (ev) => {
        const id = ev.data.entity_id;
        const newState = ev.data.new_state;
        if (!newState) return;

        if (this.interestCount.has(id)) {
          this.states.set(id, newState);

          const listeners = this.subscribers.get(id);
          if (listeners) {
            for (const cb of listeners) cb();
          }
        }
      },
      "state_changed"
    );
  }

  private disableWsIfNeeded() {
    if (this.interestCount.size === 0 && this.unsub) {
      this.unsub();
      this.unsub = undefined;
    }
  }

  private async fetchHistory(entityId: string, hours = 1) {
    if (this.histories.has(entityId)) return;
    if (this.historyLoading.has(entityId)) {
      return this.historyLoading.get(entityId);
    }

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

        this.histories.set(entityId, result?.[0] ?? []);
        const listeners = this.subscribers.get(entityId);
        listeners?.forEach((cb) => cb());
      } finally {
        this.historyLoading.delete(entityId);
      }
    })();

    this.historyLoading.set(entityId, p);
    return p;
  }

  async subscribe(
    config: MiniGraphCardConfig,
    entityId: string,
    callback: () => void
  ) {
    this.interestCount.set(
      entityId,
      (this.interestCount.get(entityId) ?? 0) + 1
    );

    if (!this.subscribers.has(entityId)) {
      this.subscribers.set(entityId, new Set());
      console.log("subscribed to: ", entityId);
    }
    this.subscribers.get(entityId)!.add(callback);

    this.states.set(entityId, this.hass.states[entityId]);

    await this.ensureWsSubscription();

    this.fetchHistory(entityId, config.hours_to_show);

    callback();

    return () => {
      const set = this.subscribers.get(entityId);
      set?.delete(callback);

      const count = (this.interestCount.get(entityId) ?? 1) - 1;

      if (count <= 0) {
        this.interestCount.delete(entityId);
        this.subscribers.delete(entityId);
        this.states.delete(entityId);
        this.histories.delete(entityId);
      } else {
        this.interestCount.set(entityId, count);
      }

      this.disableWsIfNeeded();
    };
  }

  getState(entityId: string) {
    const state = this.states.get(entityId) ?? this.hass.states[entityId];
    if (!state) return undefined;

    return {
      ...state,
      history: this.histories.get(entityId) ?? [],
    };
  }
}
