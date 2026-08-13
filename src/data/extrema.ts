import { EntityHistoryState, InfoEntry, ShowConfig } from "~/types";
import { getAvg, getMax, getMin } from "~/utils";

/**
 * Min/avg/max rows for the info section, from a history window.
 */
export function computeExtrema(
  history: EntityHistoryState[],
  show: ShowConfig
): InfoEntry[] {
  const { extrema, average } = show;

  // convert websocket-format items for the min/max/avg helpers
  const items = history.map((item) => ({
    state: item.s,
    last_changed: (item.lc ?? item.lu) * 1000,
  }));

  return [
    ...(extrema ? [{ type: "min" as const, ...getMin(items, "state") }] : []),
    ...(average
      ? [{ type: "avg" as const, state: getAvg(items, "state") }]
      : []),
    ...(extrema ? [{ type: "max" as const, ...getMax(items, "state") }] : []),
  ];
}
