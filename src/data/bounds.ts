/** Minimal series shape needed for boundary computation */
interface BoundedSeries {
  min: number;
  max: number;
}

function getBoundary(
  type: "min" | "max",
  series: BoundedSeries[],
  configVal: number | string | undefined,
  fallback: number
): number {
  if (configVal === undefined) {
    // dynamic boundary depending on values
    return Math[type](...series.map((ele) => ele[type])) || fallback;
  }
  if (String(configVal)[0] !== "~") {
    // fixed boundary
    return Number(configVal);
  }
  // soft boundary (respecting out of range values)
  return Math[type](
    Number(String(configVal).substring(1)),
    ...series.map((ele) => ele[type])
  );
}

/**
 * Y-axis boundaries for a set of series: dynamic by default, fixed via
 * config values, soft via "~" prefix, optionally widened to minRange.
 */
export function getBoundaries(
  series: BoundedSeries[],
  min: number | string | undefined,
  max: number | string | undefined,
  fallback: [number, number],
  minRange: number | string | undefined
): [number, number] {
  let boundary: [number, number] = [
    getBoundary("min", series, min, fallback[0]),
    getBoundary("max", series, max, fallback[1]),
  ];

  if (minRange) {
    const currentRange = Math.abs(boundary[0] - boundary[1]);
    const diff = parseFloat(String(minRange)) - currentRange;

    // Doesn't matter if minRange is NaN because this will be false if so
    if (diff > 0) {
      const weights = [
        (min !== undefined && String(min)[0] !== "~") || max === undefined
          ? 0
          : 1,
        (max !== undefined && String(max)[0] !== "~") || min === undefined
          ? 0
          : 1,
      ];
      const sum = weights[0] + weights[1];
      if (sum > 0) {
        boundary = [
          boundary[0] - (diff * weights[0]) / sum,
          boundary[1] + (diff * weights[1]) / sum,
        ];
      } else {
        boundary = [boundary[0] - diff / 2, boundary[1] + diff / 2];
      }
    }
  }

  return boundary;
}
