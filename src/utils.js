/* eslint-disable no-bitwise */
import { compress as lzStringCompress, decompress as lzStringDecompress } from '@kalkih/lz-string';

const getMin = (arr, val) => arr.reduce((min, p) => (
  Number(p[val]) < Number(min[val]) ? p : min
), arr[0]);
const getAvg = (arr, val) => arr.reduce((sum, p) => (
  sum + Number(p[val])
), 0) / arr.length;
const getMax = (arr, val) => arr.reduce((max, p) => (
  Number(p[val]) > Number(max[val]) ? p : max
), arr[0]);
const getTime = (date, extra, locale = 'en-US') => date.toLocaleString(locale, { hour: 'numeric', minute: 'numeric', ...extra });
const getMilli = hours => hours * 60 ** 2 * 10 ** 3;

const compress = data => lzStringCompress(JSON.stringify(data));

const decompress = data => (typeof data === 'string' ? JSON.parse(lzStringDecompress(data)) : data);

const getFirstDefinedItem = (...collection) => collection.find(item => typeof item !== 'undefined');

// eslint-disable-next-line max-len
const compareArray = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

const log = (message) => {
  // eslint-disable-next-line no-console
  console.warn('mini-graph-card: ', message);
};

/**
 * Subscribe to state changes for all entities and filter for specific ones
 * @param {object} hass - Home Assistant connection object
 * @param {Array<string>} entityIds - Entity IDs to monitor
 * @param {function} callback - Callback function to handle state changes (entityId, newState)
 * @returns {Promise<function>} Unsubscribe function
 */
const subscribeEvents = async (hass, entityIds, callback) => {
  if (!hass.connection) {
    log('No WebSocket connection available');
    return null;
  }

  try {
    const entityIdSet = new Set(entityIds);

    return await hass.connection.subscribeEvents(
      (event) => {
        if (event.data && event.data.new_state) {
          const entityId = event.data.entity_id;
          if (entityIdSet.has(entityId)) {
            callback(entityId, event.data.new_state);
          }
        }
      },
      'state_changed',
    );
  } catch (err) {
    log(`Failed to subscribe to state_changed events: ${err}`);
    return null;
  }
};

/**
 * Fetch history from WebSocket connection
 * @param {object} hass - Home Assistant connection object
 * @param {string} entityId - Entity ID to fetch history for
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {boolean} skipInitialState - Skip initial state
 * @param {boolean} withAttributes - Include attributes
 * @returns {Promise<Array>} History data
 */
const fetchHistoryWebSocket = async (
  hass,
  entityId,
  start,
  end,
  withAttributes,
) => {
  if (!hass.connection) {
    log('No WebSocket connection available');
    return null;
  }

  try {
    const params = {
      type: 'history/history_during_period',
      start_time: start.toISOString(),
      entity_ids: [entityId],
      minimal_response: !withAttributes,
      no_attributes: !withAttributes,
      significant_changes_only: withAttributes ? false : undefined,
    };

    if (end) {
      params.end_time = end.toISOString();
    }

    const result = await hass.connection.sendMessagePromise(params);

    // Transform WebSocket response to match REST API format
    // WebSocket returns: {"entity_id": [{s: "state", lu: timestamp}, ...]}
    // REST API returns: [[{state: "state", last_changed: "ISO string"}, ...]]
    if (result && typeof result === 'object') {
      const entityData = result[entityId];
      if (entityData && Array.isArray(entityData)) {
        // Convert from WebSocket format to REST API format
        const transformed = entityData.map(item => ({
          state: item.s,
          // WebSocket uses lu (last_updated) as Unix timestamp
          // Convert to ISO string for both last_changed and last_updated
          last_changed: new Date(item.lu * 1000).toISOString(),
          last_updated: new Date(item.lu * 1000).toISOString(),
          // Attributes might be present as 'a', default to empty object
          attributes: item.a || {},
        }));
        return [transformed];
      }
      // If entity data is not found, return empty array in expected format
      return [[]];
    }

    return result;
  } catch (err) {
    log(`Failed to fetch history via WebSocket for ${entityId}: ${err}`);
    return null;
  }
};

/**
 * Try to get state from Home Assistant frontend store
 * @param {object} hass - Home Assistant object
 * @param {string} entityId - Entity ID
 * @returns {object|null} Entity state or null
 */
const getStateFromStore = (hass, entityId) => {
  if (hass && hass.states && hass.states[entityId]) {
    return hass.states[entityId];
  }
  return null;
};

export {
  getMin, getAvg, getMax, getTime, getMilli, compress, decompress, log,
  getFirstDefinedItem,
  compareArray,
  subscribeEvents,
  fetchHistoryWebSocket,
  getStateFromStore,
};
