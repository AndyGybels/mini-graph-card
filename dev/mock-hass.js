// Mock Home Assistant object for development
function generateHistory(entityId, hours = 24, interval = 5) {
  const history = [];
  const now = Date.now();
  const points = (hours * 60) / interval;

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval * 60 * 1000;
    let value;

    // Generate different patterns based on entity type
    if (entityId.includes("temperature")) {
      // Temperature: sine wave between 18-24°C
      value = (20 + 3 * Math.sin((i / points) * Math.PI * 4)).toFixed(1);
    } else if (entityId.includes("humidity")) {
      // Humidity: 45-65%
      value = (55 + 10 * Math.sin((i / points) * Math.PI * 2)).toFixed(0);
    } else if (entityId.includes("consumption")) {
      // Consumption: increasing with random fluctuations
      value = ((i / points) * 10 + Math.random() * 2).toFixed(2);
    } else {
      value = (50 + 25 * Math.sin((i / points) * Math.PI * 2)).toFixed(1);
    }

    history.push({
      s: value.toString(),
      a: {},
      lu: timestamp / 1000,
    });
  }

  return history;
}

class MockConnection {
  constructor() {
    this.eventListeners = new Map();
    this.connectionListeners = new Map(); // ready / disconnected / reconnect-error
    this.historyCache = new Map();

    // Update history data every 2 seconds for faster visible changes
    setInterval(() => {
      this.updateHistory();
    }, 2000);
  }

  updateHistory() {
    // Add new data points to existing history
    const now = Date.now();

    this.historyCache.forEach((historyArray, entityId) => {
      if (!Array.isArray(historyArray) || historyArray.length === 0) return;

      let value;

      // Generate new value based on entity type with larger variations
      if (entityId.includes("temperature")) {
        // More dramatic temperature changes: 15-28°C
        value = (
          20 +
          8 * Math.sin(Date.now() / 10000) +
          Math.random() * 3
        ).toFixed(1);
      } else if (entityId.includes("humidity")) {
        // More dramatic humidity changes: 30-80%
        value = (
          55 +
          25 * Math.cos(Date.now() / 8000) +
          Math.random() * 10
        ).toFixed(0);
      } else if (entityId.includes("consumption")) {
        // Steadily increasing consumption with spikes
        const lastValue = parseFloat(historyArray[historyArray.length - 1].s);
        const spike = Math.random() > 0.7 ? Math.random() * 2 : 0;
        value = (lastValue + 0.1 + spike).toFixed(2);
      } else {
        value = (50 + 40 * Math.sin(Date.now() / 5000)).toFixed(1);
      }

      // Add new point
      historyArray.push({
        s: value.toString(),
        a: {},
        lu: now / 1000,
      });

      // Keep only last 24 hours of data (288 points at 5 min intervals)
      if (historyArray.length > 288) {
        historyArray.shift();
      }

      // Reflect the new value on the state object and notify listeners
      // with fresh timestamps, like the real state_changed event would.
      const state = window.hass.states[entityId];
      if (state) {
        const newState = {
          ...state,
          state: value.toString(),
          last_changed: new Date(now).toISOString(),
          last_updated: new Date(now).toISOString(),
        };
        window.hass.states[entityId] = newState;

        const stateListeners = this.eventListeners.get("state_changed");
        if (stateListeners) {
          stateListeners.forEach((callback) => {
            callback({
              data: {
                entity_id: entityId,
                new_state: newState,
              },
            });
          });
        }
      }
    });
  }

  // Connection lifecycle listeners, like home-assistant-js-websocket
  addEventListener(eventType, callback) {
    if (!this.connectionListeners.has(eventType)) {
      this.connectionListeners.set(eventType, []);
    }
    this.connectionListeners.get(eventType).push(callback);
  }

  removeEventListener(eventType, callback) {
    const listeners = this.connectionListeners.get(eventType);
    if (!listeners) return;
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  async subscribeEvents(callback, eventType) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);

    // Simulate periodic state changes
    const interval = setInterval(() => {
      if (eventType === "state_changed") {
        const entities = [
          "sensor.living_room_temperature",
          "sensor.indoor_humidity",
          "sensor.techworx_total_consumption_today",
        ];
        const randomEntity =
          entities[Math.floor(Math.random() * entities.length)];

        let newValue;
        if (randomEntity.includes("temperature")) {
          newValue = (20 + Math.random() * 4).toFixed(1);
        } else if (randomEntity.includes("humidity")) {
          newValue = (50 + Math.random() * 20).toFixed(0);
        } else {
          newValue = (Math.random() * 15).toFixed(2);
        }

        callback({
          data: {
            entity_id: randomEntity,
            new_state: {
              entity_id: randomEntity,
              state: newValue,
              attributes: {
                unit_of_measurement: randomEntity.includes("temperature")
                  ? "°C"
                  : randomEntity.includes("humidity")
                  ? "%"
                  : "kWh",
                friendly_name: randomEntity.split(".")[1].replace(/_/g, " "),
              },
              last_changed: new Date().toISOString(),
              last_updated: new Date().toISOString(),
            },
          },
        });
      }
    }, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      }
    };
  }

  async sendMessagePromise(message) {
    // simulate a real recorder: history queries take time
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (message.type === "history/history_during_period") {
      const entityIds = message.entity_ids || [];
      const hours =
        (new Date(message.end_time) - new Date(message.start_time)) /
        (1000 * 60 * 60);

      // Real HA keys the response by entity id
      const result = {};
      entityIds.forEach((entityId) => {
        const history = generateHistory(entityId, hours);
        this.historyCache.set(entityId, history);
        result[entityId] = history;
      });
      return result;
    }
    return null;
  }
}

window.hass = {
  connected: true,
  connection: new MockConnection(),
  states: {
    "sensor.living_room_temperature": {
      entity_id: "sensor.living_room_temperature",
      state: "21.5",
      attributes: {
        unit_of_measurement: "°C",
        friendly_name: "Living Room Temperature",
        device_class: "temperature",
      },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    "sensor.indoor_humidity": {
      entity_id: "sensor.indoor_humidity",
      state: "58",
      attributes: {
        unit_of_measurement: "%",
        friendly_name: "Indoor Humidity",
        device_class: "humidity",
      },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    "sensor.techworx_total_consumption_today": {
      entity_id: "sensor.techworx_total_consumption_today",
      state: "8.42",
      attributes: {
        unit_of_measurement: "kWh",
        friendly_name: "Total Consumption Today",
        device_class: "energy",
      },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
  },
  locale: {
    language: "en",
    number_format: "language",
  },
  config: {
    unit_system: {
      temperature: "°C",
    },
  },
  themes: {
    darkMode: false,
  },
  selectedTheme: null,
  user: {
    name: "Developer",
  },
};
