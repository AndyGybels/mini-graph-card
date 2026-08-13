import { V } from "~/const";
import { getObjectAttr } from "~/data/processHistory";
import { EntityConfig } from "~/types";
import { GraphViewModel } from "./viewModel";

/**
 * The state currently displayed for an entity: the last graphed point
 * when `show.state: last`, a resolved attribute, or the plain HA state.
 */
export function displayedState(
  vm: GraphViewModel,
  id: number
): string | number | undefined {
  const entityConfig = vm.config.entities[id];
  if (vm.config.show.state === "last") {
    const points = vm.points[id];
    if (points && points.length > 0) return points[points.length - 1][V];
  }
  if (entityConfig.attribute) {
    return getObjectAttr(vm.entities[id]?.attributes, entityConfig.attribute);
  }
  return vm.entities[id]?.state;
}

/** Entities that render a graph */
export function visibleEntities(vm: GraphViewModel): EntityConfig[] {
  return vm.config.entities.filter((entity) => entity.show_graph !== false);
}

/** Entities that appear in the legend */
export function visibleLegends(vm: GraphViewModel): EntityConfig[] {
  return visibleEntities(vm).filter((entity) => entity.show_legend !== false);
}
