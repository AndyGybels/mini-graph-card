import { StateChangedEvent } from "home-assistant-js-websocket";
import { computeDomain } from "~/common/entity/compute_domain";
import { MiniGraphCardHomeAssistant } from "~/types";

export interface EntityHistoryState {
  /** state */
  s: string;
  /** attributes */
  a: Record<string, any>;
  /** last_changed; if set, also applies to lu */
  lc?: number;
  /** last_updated */
  lu: number;
}

export interface HistoryStreamMessage {
  states: HistoryStates;
  start_time?: number; // Start time of this historical chunk
  end_time?: number; // End time of this historical chunk
}

const NEED_ATTRIBUTE_DOMAINS = [
  "climate",
  "humidifier",
  "input_datetime",
  "water_heater",
  "person",
  "device_tracker",
];

export type HistoryStates = Record<string, EntityHistoryState[]>;

const entityIdHistoryNeedsAttributes = (
  hass: MiniGraphCardHomeAssistant,
  entityId: string
) =>
  !hass.states[entityId] ||
  NEED_ATTRIBUTE_DOMAINS.includes(computeDomain(entityId));

export const fetchHistory = (
  hass: MiniGraphCardHomeAssistant,
  startTime: Date,
  endTime: Date,
  entityIds: string[]
) => {
  const params = {
    type: "history/history_during_period",
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    minimal_response: true,
    no_attributes: !entityIds.some((entityId) =>
      entityIdHistoryNeedsAttributes(hass, entityId)
    ),
  };

  if (entityIds.length !== 0) {
    return hass.connection.sendMessagePromise<HistoryStates>({
      ...params,
      entity_ids: entityIds,
    });
  }

  return hass.connection.sendMessagePromise<HistoryStates>(params);
};

/**
 * Subscribe to state changes for all entities and filter for specific ones
 * @param {object} hass - Home Assistant connection object
 * @param {Array<string>} entityIds - Entity IDs to monitor
 * @param {function} callback - Callback function to handle state changes (entityId, newState)
 * @returns {Promise<function>} Unsubscribe function
 */
export const subscribeEvents = async (
  hass: MiniGraphCardHomeAssistant,
  entityIds: string[],
  callback: (event: StateChangedEvent) => void
) => {
  if (!hass.connection) {
    console.log("No WebSocket connection available");
    return null;
  }

  try {
    const entityIdSet = new Set(entityIds);

    return await hass.connection.subscribeEvents<StateChangedEvent>((event) => {
      if (event.data && event.data.new_state) {
        const entityId = event.data.entity_id;
        if (entityIdSet.has(entityId)) {
          callback(event);
        }
      }
    }, "state_changed");
  } catch (err) {
    console.log(`Failed to subscribe to state_changed events: ${err}`);
    return null;
  }
};
