/**
 * Color Utilities Test Suite
 *
 * Tests for interpolateRGB, which resolves CSS variables before
 * interpolation (upstream fix kalkih/mini-graph-card#1270).
 */

import { interpolateRGB } from "../src/presentation/color";

describe("interpolateRGB", () => {
  test("should interpolate between two plain colors", () => {
    const result = interpolateRGB("rgb(0, 0, 0)", "rgb(255, 255, 255)", 0.5);
    expect(result).toBe("rgb(128, 128, 128)");
  });

  test("should return the start color at factor 0", () => {
    const result = interpolateRGB("rgb(10, 20, 30)", "rgb(255, 255, 255)", 0);
    expect(result).toBe("rgb(10, 20, 30)");
  });

  test("should resolve a CSS variable in the start color", () => {
    document.body.style.setProperty("--test-start", "rgb(255, 0, 0)");
    const result = interpolateRGB("var(--test-start)", "rgb(0, 0, 255)", 0.5);
    expect(result).toBe("rgb(128, 0, 128)");
  });

  test("should resolve a CSS variable in the end color", () => {
    document.body.style.setProperty("--test-end", "rgb(0, 255, 0)");
    const result = interpolateRGB("rgb(0, 0, 0)", "var(--test-end)", 1);
    expect(result).toBe("rgb(0, 255, 0)");
  });
});
