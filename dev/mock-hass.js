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
    if (message.type === "history/history_during_period") {
      const entityIds = message.entity_ids || [];
      const hours =
        (new Date(message.end_time) - new Date(message.start_time)) /
        (1000 * 60 * 60);

      return entityIds.map((entityId) => generateHistory(entityId, hours));
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
