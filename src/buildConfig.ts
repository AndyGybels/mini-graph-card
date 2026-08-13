import {
  URL_DOCS,
  FONT_SIZE,
  FONT_SIZE_HEADER,
  MAX_BARS,
  DEFAULT_COLORS,
  DEFAULT_SHOW,
} from "./const";
import {
  ColorThreshold,
  ColorThresholdInput,
  EntityConfig,
  MiniGraphCardConfig,
  StateMapItem,
  TypeOfTransition,
} from "./types";
import { log } from "./utils";
import { LovelaceCardConfig } from "home-assistant-frontend-types";

// ---------------------------------------------------------------------
// Type guards for the raw (untrusted) user configuration
// ---------------------------------------------------------------------
const isString = (value: unknown): value is string =>
  typeof value === "string";

const isEntityString = (entity: string | EntityConfig): entity is string =>
  typeof entity === "string";

const isEntityObject = (x: string | EntityConfig): x is EntityConfig =>
  typeof x === "object" && x !== null && "entity" in x;

const isStateMapString = (state: string | StateMapItem): state is string =>
  typeof state === "string";

const isColorThresholdString = (
  threshold: string | ColorThresholdInput
): threshold is string => typeof threshold === "string";

/**
 * Finds the next array element with a defined "value" property, starting from the given index.
 * Used for interpolating color threshold values between defined stops.
 *
 * @param stops - Array of color threshold inputs
 * @param startIndex - Index to start searching from
 * @returns Index of the next valued stop
 * @throws Error if no valued stop is found
 */
const findFirstValuedIndex = (
  stops: ColorThresholdInput[],
  startIndex: number
): number => {
  for (let i = startIndex, l = stops.length; i < l; i += 1) {
    if (stops[i].value != null) {
      return i;
    }
  }
  throw new Error(
    "Error in threshold interpolation: could not find right-nearest valued stop. " +
      'Do the first and last thresholds have a set "value"?'
  );
};

/**
 * Interpolates threshold values for color stops that don't have explicit values.
 * Converts string color stops to objects and fills in missing values using linear interpolation.
 *
 * For example, given stops with values `[0, null, null, 4, null, 3]`,
 * the interpolation will output `[0, 1.333, 2.667, 4, 3.5, 3]`.
 *
 * Note: The first and last stops must have explicit values.
 *
 * @param stops - Array of color stops (strings or objects with optional values)
 * @returns Array of color thresholds with all values defined
 * @throws Error if first or last stop doesn't have a value
 */
const interpolateStops = (
  stops: (string | ColorThresholdInput)[]
): ColorThreshold[] => {
  if (!stops || !stops.length) {
    return stops as ColorThreshold[];
  }

  // Convert string stops to objects
  const normalizedStops: ColorThresholdInput[] = stops.map((stop) =>
    isColorThresholdString(stop) ? { color: stop, value: null } : stop
  );

  if (
    normalizedStops[0].value == null ||
    normalizedStops[normalizedStops.length - 1].value == null
  ) {
    throw new Error(
      `The first and last thresholds must have a set "value".\n See ${URL_DOCS}`
    );
  }

  let leftValuedIndex = 0;
  let rightValuedIndex: number | null = null;

  return normalizedStops.map((stop, stopIndex) => {
    if (stop.value != null) {
      leftValuedIndex = stopIndex;
      return { color: stop.color || "", value: stop.value };
    }

    if (rightValuedIndex == null) {
      rightValuedIndex = findFirstValuedIndex(normalizedStops, stopIndex);
    } else if (stopIndex > rightValuedIndex) {
      leftValuedIndex = rightValuedIndex;
      rightValuedIndex = findFirstValuedIndex(normalizedStops, stopIndex);
    }

    // y = mx + b
    // m = dY/dX
    // x = index in question
    // b = left value

    const leftValue = normalizedStops[leftValuedIndex].value!;
    const rightValue = normalizedStops[rightValuedIndex].value!;
    const m = (rightValue - leftValue) / (rightValuedIndex - leftValuedIndex);
    return {
      color: stop.color || "",
      value: m * stopIndex + leftValue,
    };
  });
};

/**
 * Computes final color thresholds from input stops, applying interpolation and transitions.
 * Supports two transition types: 'smooth' for gradual color changes, or 'hard' for stepped changes.
 *
 * @param stops - Array of color stops (strings or threshold objects)
 * @param type - Transition type ('smooth' or 'hard')
 * @returns Sorted array of color thresholds (descending by value)
 */
const computeThresholds = (
  stops: (string | ColorThresholdInput)[],
  type: TypeOfTransition
): ColorThreshold[] => {
  const valuedStops = interpolateStops(stops);
  valuedStops.sort((a, b) => b.value - a.value);

  if (type === "smooth") {
    return valuedStops;
  } else {
    const rect: ColorThreshold[] = [];
    valuedStops.forEach((stop, i) => {
      rect.push(stop);
      rect.push({
        value: stop.value - 0.0001,
        color: valuedStops[i + 1] ? valuedStops[i + 1].color : stop.color,
      });
    });
    return rect;
  }
};

/**
 * Builds and validates the complete card configuration with defaults.
 * Merges user configuration with default values, validates required fields,
 * normalizes entity and state map formats, and computes derived values.
 *
 * @param config - Partial user configuration
 * @returns Complete validated card configuration
 * @throws Error if entities are not provided as an array
 * @throws Error if deprecated line_color_above/below options are used
 */
export default (config: LovelaceCardConfig): MiniGraphCardConfig => {
  if (!Array.isArray(config.entities))
    throw new Error(
      `Please provide the "entities" option as a list.\n See ${URL_DOCS}`
    );
  if (config.line_color_above || config.line_color_below)
    throw new Error(
      `"line_color_above/line_color_below" was removed, please use "color_thresholds".\n See ${URL_DOCS}`
    );

  const conf: MiniGraphCardConfig = {
    animate: false,
    hour24: false,
    font_size: FONT_SIZE,
    font_size_header: FONT_SIZE_HEADER,
    height: 100,
    hours_to_show: 24,
    points_per_hour: 0.5,
    aggregate_func: "avg",
    group_by: "interval",
    line_color: [...DEFAULT_COLORS],
    color_thresholds: [],
    color_thresholds_transition: "smooth",
    line_width: 5,
    bar_spacing: 4,
    compress: true,
    smoothing: true,
    state_map: [],
    cache: true,
    value_factor: 0,
    tap_action: {
      action: "more-info",
    },
    format: {},
    ...JSON.parse(JSON.stringify(config)),
    show: { ...DEFAULT_SHOW, ...config.show },
  };

  // Normalize entity configurations: strings become objects, and every
  // entity records its index (required for filtered views and legends)
  conf.entities = conf.entities.map(
    (entity: string | EntityConfig, i: number): EntityConfig => ({
      ...(isEntityObject(entity) ? entity : { entity }),
      index: i,
    })
  );

  // Normalize state map configurations
  conf.state_map.forEach((state: string | StateMapItem, i: number) => {
    if (isStateMapString(state)) {
      conf.state_map[i] = { value: state, label: state };
    }
    const stateItem = conf.state_map[i] as StateMapItem;
    stateItem.label = stateItem.label || stateItem.value.toString();
  });

  // Normalize line colors
  if (isString(config.line_color)) {
    conf.line_color = [config.line_color, ...DEFAULT_COLORS];
  }

  // Compute derived configuration values
  conf.font_size =
    (config.font_size ? config.font_size / 100 : 1) * FONT_SIZE || FONT_SIZE;
  conf.color_thresholds = computeThresholds(
    conf.color_thresholds,
    conf.color_thresholds_transition
  );

  // Configure date/time formatting based on settings
  const additional: Intl.DateTimeFormatOptions =
    conf.hours_to_show > 24 ? { day: "numeric", weekday: "short" } : {};
  const hourFormat: Intl.DateTimeFormatOptions = conf.hour24
    ? { hourCycle: "h23" }
    : { hour12: true };
  conf.format = { ...hourFormat, ...additional };

  // Adjust points_per_hour based on grouping interval
  switch (conf.group_by) {
    case "date":
      conf.points_per_hour = 1 / 24;
      break;
    case "hour":
      conf.points_per_hour = 1;
      break;
    default:
      break;
  }

  // Ensure bar graphs don't exceed maximum bar count
  if (conf.show.graph === "bar") {
    const entities = conf.entities.length;
    if (conf.hours_to_show * conf.points_per_hour * entities > MAX_BARS) {
      conf.points_per_hour = MAX_BARS / (conf.hours_to_show * entities);
      log(`Not enough space, adjusting points_per_hour to ${conf.points_per_hour}`);
    }
  }

  return conf;
};
