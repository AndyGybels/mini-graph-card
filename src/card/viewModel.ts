import Graph, { Bar, GradientResult, Point } from "~/graph";
import { getBoundaries } from "~/data/bounds";
import { computeExtrema } from "~/data/extrema";
import { processHistory } from "~/data/processHistory";
import {
  EntityConfig,
  InfoEntry,
  MiniGraphCardConfig,
  StoreEntityState,
} from "~/types";

/**
 * Everything the view layer needs, precomputed and immutable.
 * Swapped by reference on every data change, so Lit's strict-equality
 * change detection works without any manual array cloning.
 */
export interface GraphViewModel {
  config: MiniGraphCardConfig;
  entities: (StoreEntityState | undefined)[];
  line: (string | undefined)[];
  fill: (string | undefined)[];
  points: (Point[] | undefined)[];
  bar: (Bar[] | undefined)[];
  gradient: (GradientResult[] | undefined)[];
  bound: [number, number];
  boundSecondary: [number, number];
  abs: InfoEntry[];
  /** all graphs whose history has loaded (or that are hidden) */
  ready: boolean;
}

const visibleEntities = (config: MiniGraphCardConfig): EntityConfig[] =>
  config.entities.filter((entity) => entity.show_graph !== false);

const seriesFor = (
  config: MiniGraphCardConfig,
  graphs: Graph[],
  axis: "primary" | "secondary"
): Graph[] =>
  visibleEntities(config)
    .filter((entity) => (entity.y_axis ?? "primary") === axis)
    .map((entity) => graphs[entity.index!]);

/**
 * Feed fresh history into the Graph instances and derive the complete,
 * immutable view-model for one render pass.
 */
export function computeViewModel(
  config: MiniGraphCardConfig,
  entities: (StoreEntityState | undefined)[],
  graphs: Graph[],
  prevBound: [number, number] = [0, 0],
  prevBoundSecondary: [number, number] = [0, 0]
): GraphViewModel {
  const line: (string | undefined)[] = [];
  const fill: (string | undefined)[] = [];
  const points: (Point[] | undefined)[] = [];
  const bar: (Bar[] | undefined)[] = [];
  const gradient: (GradientResult[] | undefined)[] = [];
  let abs: InfoEntry[] = [];

  if (config.show.graph) {
    entities.forEach((entity, i) => {
      if (!entity || !entity.historyLoaded) return;
      if (config.entities[i].show_graph === false) return;

      const history = processHistory(config, config.entities[i], entity.history);
      if (history.length === 0) return;

      if (entities[0] && entity.entity_id === entities[0].entity_id) {
        abs = computeExtrema(history, config.show);
      }

      if (config.entities[i].fixed_value === true) {
        const last = history[history.length - 1];
        graphs[i].update([last, last]);
      } else {
        graphs[i].update(history);
      }
    });
  }

  const bound = getBoundaries(
    seriesFor(config, graphs, "primary"),
    config.lower_bound,
    config.upper_bound,
    prevBound,
    config.min_bound_range
  );

  const boundSecondary = getBoundaries(
    seriesFor(config, graphs, "secondary"),
    config.lower_bound_secondary,
    config.upper_bound_secondary,
    prevBoundSecondary,
    config.min_bound_range_secondary
  );

  if (config.show.graph) {
    let graphPos = 0;
    entities.forEach((entity, i) => {
      if (!entity || graphs[i].coords.length === 0) return;

      const axisBound =
        config.entities[i].y_axis === "secondary" ? boundSecondary : bound;
      [graphs[i].min, graphs[i].max] = [axisBound[0], axisBound[1]];

      if (config.show.graph === "bar") {
        const numVisible = visibleEntities(config).length;
        bar[i] = graphs[i].getBars(graphPos, numVisible, config.bar_spacing);
        graphPos += 1;
      } else {
        const path = graphs[i].getPath();
        if (config.entities[i].show_line !== false) line[i] = path;
        if (config.show.fill && config.entities[i].show_fill !== false)
          fill[i] = graphs[i].getFill(path);
        if (config.show.points && config.entities[i].show_points !== false)
          points[i] = graphs[i].getPoints();
        if (config.color_thresholds.length > 0 && !config.entities[i].color)
          gradient[i] = graphs[i].computeGradient(
            config.color_thresholds,
            config.logarithmic ?? false
          );
      }
    });
  }

  const ready =
    (entities[0] !== undefined &&
      !graphs.some(
        (_, index) =>
          !entities[index]?.historyLoaded &&
          config.entities[index].show_graph !== false
      )) ||
    config.show.loading_indicator === false;

  return {
    config,
    entities,
    line,
    fill,
    points,
    bar,
    gradient,
    bound,
    boundSecondary,
    abs,
    ready,
  };
}
