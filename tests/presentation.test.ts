/**
 * Pure presentation & data layer tests
 *
 * Formerly tested through MiniGraphCard prototype hacks; now the logic
 * lives in pure modules and is tested directly.
 */

import buildConfig from "../src/buildConfig";
import {
  formatState,
  formatName,
  formatUom,
} from "../src/presentation/format";
import { computeColor } from "../src/presentation/color";
import { computeTooltip } from "../src/presentation/tooltip";
import { getBoundaries } from "../src/data/bounds";
import { computeExtrema } from "../src/data/extrema";
import { processHistory } from "../src/data/processHistory";

const c = (cfg: any) => ({ type: "custom:mini-graph-card", ...cfg });

const config = (overrides: any = {}) =>
  buildConfig(c({ entities: ["sensor.a", "sensor.b"], ...overrides }));

const entities: any = [
  {
    entity_id: "sensor.a",
    state: "21.5",
    attributes: { unit_of_measurement: "°C", friendly_name: "Sensor A" },
  },
  {
    entity_id: "sensor.b",
    state: "55",
    attributes: { unit_of_measurement: "%", friendly_name: "Sensor B" },
  },
];

describe("formatState", () => {
  test("rounds to configured decimals", () => {
    expect(formatState(config({ decimals: 2 }), "en", "21.456")).toBe("21.46");
  });

  test("parses comma decimal separators", () => {
    expect(formatState(config(), "en", "21,5")).toBe("21.5");
  });

  test("maps states through state_map", () => {
    const cfg = config({
      state_map: [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
    });
    expect(formatState(cfg, "en", "on")).toBe("On");
  });

  test("applies value_factor", () => {
    expect(formatState(config({ value_factor: 3 }), "en", "2")).toBe("2,000");
  });
});

describe("formatName", () => {
  test("prefers configured name over friendly_name", () => {
    const cfg = config({
      entities: [{ entity: "sensor.a", name: "Custom" }, "sensor.b"],
    });
    expect(formatName(cfg.entities[0], entities[0])).toBe("Custom");
  });

  test("falls back to the entity friendly_name", () => {
    expect(formatName(config().entities[1], entities[1])).toBe("Sensor B");
  });
});

describe("formatUom", () => {
  test("prefers per-entity unit", () => {
    const cfg = config({
      entities: [{ entity: "sensor.a", unit: "W" }, "sensor.b"],
    });
    expect(formatUom(cfg, cfg.entities[0], entities[0])).toBe("W");
  });

  test("falls back to card unit, then the entity attribute", () => {
    const withUnit = config({ unit: "kWh" });
    expect(formatUom(withUnit, withUnit.entities[0], entities[0])).toBe("kWh");
    const plain = config();
    expect(formatUom(plain, plain.entities[0], entities[0])).toBe("°C");
  });
});

describe("computeColor", () => {
  test("uses the per-entity color when configured", () => {
    const cfg = config({
      entities: [{ entity: "sensor.a", color: "#123456" }, "sensor.b"],
    });
    expect(computeColor(cfg, 0, "10")).toBe("#123456");
  });

  test("falls back to line_color by index", () => {
    expect(computeColor(config({ line_color: ["red", "green"] }), 1, "10")).toBe(
      "green"
    );
  });

  test("interpolates color_thresholds", () => {
    const cfg = config({
      color_thresholds: [
        { value: 0, color: "rgb(0, 0, 255)" },
        { value: 10, color: "rgb(255, 0, 0)" },
      ],
      color_thresholds_transition: "smooth",
    });
    expect(computeColor(cfg, 0, 5)).toBe("rgb(128, 0, 128)");
  });
});

describe("getBoundaries", () => {
  test("computes dynamic boundaries from series extremes", () => {
    const series = [
      { min: 1, max: 5 },
      { min: 2, max: 9 },
    ];
    expect(getBoundaries(series, undefined, undefined, [0, 0], undefined)).toEqual(
      [1, 9]
    );
  });

  test("respects fixed boundaries", () => {
    const series = [{ min: 1, max: 5 }];
    expect(getBoundaries(series, 0, 10, [0, 0], undefined)).toEqual([0, 10]);
  });

  test("supports soft boundaries with ~ prefix", () => {
    const series = [{ min: 4, max: 5 }];
    expect(getBoundaries(series, "~2", "~10", [0, 0], undefined)).toEqual([
      2, 10,
    ]);
  });

  test("expands range to min_bound_range", () => {
    const series = [{ min: 4, max: 6 }];
    // range is 2, min_bound_range 10 → expand symmetrically by 4 each side
    expect(getBoundaries(series, undefined, undefined, [0, 0], 10)).toEqual([
      0, 10,
    ]);
  });
});

describe("computeExtrema", () => {
  test("computes min, avg and max from websocket-format history", () => {
    const nowSec = Date.now() / 1000;
    const abs = computeExtrema(
      [
        { s: "10", a: {}, lu: nowSec - 300 },
        { s: "30", a: {}, lu: nowSec - 200 },
        { s: "20", a: {}, lu: nowSec - 100 },
      ],
      config({ show: { extrema: true, average: true } }).show
    );

    expect(abs.map((entry) => entry.type)).toEqual(["min", "avg", "max"]);
    expect(abs[0].state).toBe("10");
    expect(abs[1].state).toBe(20);
    expect(abs[2].state).toBe("30");
  });
});

describe("computeTooltip", () => {
  test("stores value, entity and index with a time range", () => {
    const tooltip = computeTooltip(config(), "en", 1, 5, "22.0");
    expect(tooltip.value).toBe("22.0");
    expect(tooltip.entity).toBe(1);
    expect(tooltip.index).toBe(5);
    expect(tooltip.time).toHaveLength(2);
  });
});

describe("processHistory", () => {
  test("drops non-numeric states", () => {
    const cfg = config();
    const items = processHistory(cfg, cfg.entities[0], [
      { s: "10", a: {}, lu: 1 },
      { s: "unavailable", a: {}, lu: 2 },
      { s: "20", a: {}, lu: 3 },
    ]);
    expect(items.map((item) => item.s)).toEqual(["10", "20"]);
  });

  test("resolves attribute paths", () => {
    const cfg = config({
      entities: [{ entity: "sensor.a", attribute: "power.current" }, "sensor.b"],
    });
    const items = processHistory(cfg, cfg.entities[0], [
      { s: "on", a: { power: { current: 42 } }, lu: 1 },
    ]);
    expect(items.map((item) => item.s)).toEqual(["42"]);
  });

  test("maps states through state_map to indices", () => {
    const cfg = config({
      state_map: [
        { value: "off", label: "Off" },
        { value: "on", label: "On" },
      ],
    });
    const items = processHistory(cfg, cfg.entities[0], [
      { s: "on", a: {}, lu: 1 },
      { s: "off", a: {}, lu: 2 },
    ]);
    expect(items.map((item) => item.s)).toEqual(["1", "0"]);
  });
});
