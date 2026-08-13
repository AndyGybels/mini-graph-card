import { MiniGraphCardConfig, Tooltip } from "~/types";
import { getMilli, getTime } from "~/utils";

/**
 * Build the tooltip state for a hovered point/bar: the value plus the
 * formatted start/end of the time bin it represents.
 */
export function computeTooltip(
  config: MiniGraphCardConfig,
  language: string,
  entity: number,
  index: number,
  value: string | number | undefined,
  label: string | null = null
): Tooltip {
  const { group_by, points_per_hour, hours_to_show, format } = config;

  // time units in milliseconds in this function
  const interval = getMilli(1 / points_per_hour);
  const n_points = Math.ceil(hours_to_show * points_per_hour);

  // index is 0 (oldest) to n_points-1 (most recent ~= now)
  // count of intervals from now to end of bin
  const count = n_points - 1 - index;

  // offset end by a minute, if grouped by, e.g., date or hour
  const oneMinute = group_by !== "interval" ? 60000 : 0;

  const now = getEndDate(config);

  now.setMilliseconds(now.getMilliseconds() - oneMinute - interval * count);
  const end = getTime(now, format, language);
  now.setMilliseconds(now.getMilliseconds() + oneMinute - interval);
  const start = getTime(now, format, language);

  return {
    value,
    entity,
    time: [start, end],
    index,
    label,
  };
}

/** End of the visible window, aligned to the group_by boundary */
export function getEndDate(config: MiniGraphCardConfig): Date {
  const date = new Date();
  switch (config.group_by) {
    case "date":
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0);
      break;
    case "hour":
      date.setHours(date.getHours() + 1);
      date.setMinutes(0, 0);
      break;
    default:
      break;
  }
  return date;
}
