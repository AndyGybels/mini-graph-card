/**
 * GraphViewModel Test Suite
 */

import buildConfig from "../src/buildConfig";
import Graph from "../src/graph";
import { computeViewModel } from "../src/card/viewModel";

const c = (cfg: any) => ({ type: "custom:mini-graph-card", ...cfg });

function makeGraphs(config: any) {
  return config.entities.map(
    () =>
      new Graph(
        500,
        config.height,
        [0, config.line_width],
        config.hours_to_show,
        config.points_per_hour,
        config.aggregate_func,
        config.group_by,
        false,
        false
      )
  );
}

const nowSec = Date.now() / 1000;

const entityState = (id: string, history: any[]): any => ({
  entity_id: id,
  state: "20",
  attributes: {},
  history,
  historyLoaded: true,
});

describe("computeViewModel", () => {
  test("produces a line path, points and bounds from history", () => {
    const config = buildConfig(
      c({ entities: ["sensor.a"], hours_to_show: 2, points_per_hour: 1 })
    );
    const graphs = makeGraphs(config);
    const entities = [
      entityState("sensor.a", [
        { s: "10", a: {}, lu: nowSec - 1.5 * 3600 },
        { s: "30", a: {}, lu: nowSec - 0.5 * 3600 },
      ]),
    ];

    const vm = computeViewModel(config, entities, graphs);

    expect(vm.ready).toBe(true);
    expect(vm.line[0]).toMatch(/^M/);
    expect(vm.fill[0]).toMatch(/z$/);
    expect(vm.bound).toEqual([10, 30]);
  });

  test("is not ready while history is loading", () => {
    const config = buildConfig(c({ entities: ["sensor.a"] }));
    const graphs = makeGraphs(config);
    const entities = [
      { ...entityState("sensor.a", []), historyLoaded: false },
    ];

    const vm = computeViewModel(config, entities, graphs);

    expect(vm.ready).toBe(false);
    expect(vm.line[0]).toBeUndefined();
  });

  test("produces bars in bar mode", () => {
    const config = buildConfig(
      c({
        entities: ["sensor.a"],
        hours_to_show: 3,
        points_per_hour: 1,
        show: { graph: "bar" },
      })
    );
    const graphs = makeGraphs(config);
    const entities = [
      entityState("sensor.a", [
        { s: "10", a: {}, lu: nowSec - 2.5 * 3600 },
        { s: "20", a: {}, lu: nowSec - 1.5 * 3600 },
        { s: "30", a: {}, lu: nowSec - 0.5 * 3600 },
      ]),
    ];

    const vm = computeViewModel(config, entities, graphs);

    expect(vm.bar[0]).toHaveLength(3);
    expect(vm.line[0]).toBeUndefined();
  });

  test("computes extrema for the primary entity when enabled", () => {
    const config = buildConfig(
      c({
        entities: ["sensor.a"],
        hours_to_show: 2,
        points_per_hour: 1,
        show: { extrema: true, average: true },
      })
    );
    const graphs = makeGraphs(config);
    const entities = [
      entityState("sensor.a", [
        { s: "10", a: {}, lu: nowSec - 1.5 * 3600 },
        { s: "30", a: {}, lu: nowSec - 0.5 * 3600 },
      ]),
    ];

    const vm = computeViewModel(config, entities, graphs);

    expect(vm.abs.map((entry) => entry.type)).toEqual(["min", "avg", "max"]);
  });
});
