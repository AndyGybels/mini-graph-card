import { interpolateRgb } from "d3-interpolate";
import { MiniGraphCardConfig } from "~/types";

// Ported from upstream kalkih/mini-graph-card#1270:
// d3-interpolate can't parse CSS variables, so resolve them to their
// computed values before interpolating.
const isAssumingCssVar = (value: string): boolean =>
  typeof value === "string" && value.trim().startsWith("var(--");

const convertCssVarToValue = (cssVar: string): string => {
  const name = cssVar.trim().replace("var(", "").replace(")", "");
  const element = document.querySelector("ha-card") ?? document.body;
  return window
    ? window.getComputedStyle(element).getPropertyValue(name)
    : "#000000";
};

export const interpolateRGB = (
  start: string,
  end: string,
  y: number
): string => {
  const _start = isAssumingCssVar(start) ? convertCssVarToValue(start) : start;
  const _end = isAssumingCssVar(end) ? convertCssVarToValue(end) : end;
  return interpolateRgb(_start, _end)(y);
};

/**
 * Resolve the display color for an entity's value:
 * per-entity color → interpolated color_thresholds → line_color by index.
 */
export function computeColor(
  config: MiniGraphCardConfig,
  index: number,
  inState: string | number | undefined
): string {
  const { color_thresholds, line_color } = config;
  const state = Number(inState) || 0;

  let intColor;
  if (color_thresholds.length > 0) {
    const { color } =
      color_thresholds.find((ele) => ele.value < state) ||
      color_thresholds.slice(-1)[0];
    intColor = color;
    const thresholdIndex = color_thresholds.findIndex(
      (ele) => ele.value < state
    );
    const c1 = color_thresholds[thresholdIndex];
    const c2 = color_thresholds[thresholdIndex - 1];
    if (c2) {
      const factor = (c2.value - state) / (c2.value - c1.value);
      intColor = interpolateRGB(c2.color, c1.color, factor);
    } else {
      intColor = thresholdIndex
        ? color_thresholds[color_thresholds.length - 1].color
        : color_thresholds[0].color;
    }
  }

  return (
    config.entities[index]?.color || intColor || line_color[index] || line_color[0]
  );
}
