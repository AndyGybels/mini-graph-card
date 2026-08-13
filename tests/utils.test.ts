/**
 * Utility Functions Test Suite
 *
 * Tests for utility functions used throughout the card.
 */

import {
  getMin,
  getMax,
  getAvg,
  getTime,
  getMilli,
  compress,
  decompress,
  getFirstDefinedItem,
  compareArray,
  createThrottle,
  log,
} from "../src/utils";

describe("Utility Functions", () => {
  describe("getMin", () => {
    test("should find minimum value and its metadata", () => {
      const data = [
        { state: "20", last_changed: "2024-01-01T10:00:00" },
        { state: "10", last_changed: "2024-01-01T11:00:00" },
        { state: "30", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getMin(data, "state");
      expect(result.state).toBe("10");
      expect(result.last_changed).toBe("2024-01-01T11:00:00");
    });

    test("should handle single element array", () => {
      const data = [{ state: "42", last_changed: "2024-01-01T10:00:00" }];
      const result = getMin(data, "state");
      expect(result.state).toBe("42");
    });

    test("should handle negative values", () => {
      const data = [
        { state: "5", last_changed: "2024-01-01T10:00:00" },
        { state: "-10", last_changed: "2024-01-01T11:00:00" },
        { state: "0", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getMin(data, "state");
      expect(result.state).toBe("-10");
    });
  });

  describe("getMax", () => {
    test("should find maximum value and its metadata", () => {
      const data = [
        { state: "20", last_changed: "2024-01-01T10:00:00" },
        { state: "50", last_changed: "2024-01-01T11:00:00" },
        { state: "30", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getMax(data, "state");
      expect(result.state).toBe("50");
      expect(result.last_changed).toBe("2024-01-01T11:00:00");
    });

    test("should handle single element array", () => {
      const data = [{ state: "42", last_changed: "2024-01-01T10:00:00" }];
      const result = getMax(data, "state");
      expect(result.state).toBe("42");
    });

    test("should handle negative values", () => {
      const data = [
        { state: "5", last_changed: "2024-01-01T10:00:00" },
        { state: "-10", last_changed: "2024-01-01T11:00:00" },
        { state: "20", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getMax(data, "state");
      expect(result.state).toBe("20");
    });
  });

  describe("getAvg", () => {
    test("should calculate average of array values", () => {
      const data = [
        { state: "10", last_changed: "2024-01-01T10:00:00" },
        { state: "20", last_changed: "2024-01-01T11:00:00" },
        { state: "30", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getAvg(data, "state");
      expect(result).toBe(20);
    });

    test("should handle single element", () => {
      const data = [{ state: "42", last_changed: "2024-01-01T10:00:00" }];
      const result = getAvg(data, "state");
      expect(result).toBe(42);
    });

    test("should handle negative values", () => {
      const data = [
        { state: "10", last_changed: "2024-01-01T10:00:00" },
        { state: "-10", last_changed: "2024-01-01T11:00:00" },
        { state: "20", last_changed: "2024-01-01T12:00:00" },
      ];
      const result = getAvg(data, "state");
      expect(result).toBeCloseTo(6.666666, 5);
    });

    test("should convert values to numbers", () => {
      const data = [
        { state: "10.5", last_changed: "2024-01-01T10:00:00" },
        { state: "20.5", last_changed: "2024-01-01T11:00:00" },
      ];
      const result = getAvg(data, "state");
      expect(result).toBe(15.5);
    });
  });

  describe("getTime", () => {
    test("should format time with locale", () => {
      const date = new Date("2024-01-01T14:30:00");
      const result = getTime(date, {}, "en-US");
      expect(result).toMatch(/2:30 PM|14:30/);
    });

    test("should use extra options", () => {
      const date = new Date("2024-01-01T14:30:00");
      const result = getTime(date, { second: "numeric" }, "en-US");
      expect(result).toMatch(/00/);
    });

    test("should use language for locale", () => {
      const date = new Date("2024-01-01T14:30:00");
      const resultUS = getTime(date, {}, "en-US");
      const resultDE = getTime(date, {}, "de-DE");
      expect(typeof resultUS).toBe("string");
      expect(typeof resultDE).toBe("string");
    });
  });

  describe("getMilli", () => {
    test("should convert hours to milliseconds", () => {
      expect(getMilli(1)).toBe(3600000);
      expect(getMilli(24)).toBe(86400000);
    });

    test("should handle decimal hours", () => {
      expect(getMilli(0.5)).toBe(1800000);
      expect(getMilli(1.5)).toBe(5400000);
    });

    test("should handle zero", () => {
      expect(getMilli(0)).toBe(0);
    });
  });

  describe("compress", () => {
    test("should compress string data", () => {
      const data = { test: "value", number: 42 };
      const result = compress(data);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    test("should handle empty object", () => {
      const data = {};
      const result = compress(data);
      expect(typeof result).toBe("string");
    });

    test("should be reversible with decompress", () => {
      const data = {
        test: "value",
        number: 42,
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
      };
      const compressed = compress(data);
      const decompressed = decompress(compressed);
      expect(decompressed).toEqual(data);
    });

    test("should serialize objects before compression", () => {
      const data = { complex: { nested: { data: [1, 2, 3] } } };
      const result = compress(data);
      expect(typeof result).toBe("string");
    });
  });

  describe("decompress", () => {
    test("should decompress compressed data", () => {
      const original = { test: "data", value: 123 };
      const compressed = compress(original);
      const result = decompress(compressed);
      expect(result).toEqual(original);
    });

    test("should handle non-string data passthrough", () => {
      const data = { already: "decompressed" };
      const result = decompress(data);
      expect(result).toBe(data);
    });

    test("should deserialize objects after decompression", () => {
      const original = { key: "value", num: 42 };
      const compressed = compress(original);
      const result = decompress(compressed);
      expect(result).toEqual(original);
      expect(typeof result).toBe("object");
    });
  });

  describe("getFirstDefinedItem", () => {
    test("should return first non-undefined value", () => {
      const result = getFirstDefinedItem(
        undefined,
        undefined,
        "found",
        "other"
      );
      expect(result).toBe("found");
    });

    test("should skip undefined values", () => {
      const result = getFirstDefinedItem(undefined, "second");
      expect(result).toBe("second");
    });

    test("should skip null values", () => {
      const result = getFirstDefinedItem(null, "other");
      expect(result).toBe("other");
    });

    test("should return undefined if all values are undefined or null", () => {
      const result = getFirstDefinedItem(undefined, null);
      expect(result).toBeUndefined();
    });

    test("should return false if defined", () => {
      const result: any = getFirstDefinedItem(false as any, "other");
      expect(result).toBe(false);
    });

    test("should return 0 if defined", () => {
      const result: any = getFirstDefinedItem(0 as any, "other");
      expect(result).toBe(0);
    });

    test("should return undefined if all undefined", () => {
      const result = getFirstDefinedItem(undefined, undefined);
      expect(result).toBeUndefined();
    });

    test("should return empty string if defined", () => {
      const result = getFirstDefinedItem("", "other");
      expect(result).toBe("");
    });
  });

  describe("createThrottle", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test("runs immediately on the first call (leading edge)", () => {
      const fn = jest.fn();
      const throttled = createThrottle(fn, 1000);

      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("coalesces calls within the window into one trailing call", () => {
      const fn = jest.fn();
      const throttled = createThrottle(fn, 1000);

      throttled(); // leading
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2); // one trailing call
    });

    test("runs immediately again once the window has passed", () => {
      const fn = jest.fn();
      const throttled = createThrottle(fn, 1000);

      throttled();
      jest.advanceTimersByTime(1500);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("compareArray", () => {
    test("should return true for identical arrays", () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      expect(compareArray(a, b)).toBe(true);
    });

    test("should return false for different arrays", () => {
      const a = [1, 2, 3];
      const b = [1, 2, 4];
      expect(compareArray(a, b)).toBe(false);
    });

    test("should compare array lengths", () => {
      const a = [1, 2];
      const b = [1, 2, 3];
      expect(compareArray(a, b)).toBe(false);
    });

    test("should compare string arrays", () => {
      const a = ["a", "b", "c"];
      const b = ["a", "b", "c"];
      const c = ["a", "b", "d"];
      expect(compareArray(a, b)).toBe(true);
      expect(compareArray(a, c)).toBe(false);
    });

    test("should handle empty arrays", () => {
      const a: any[] = [];
      const b: any[] = [];
      expect(compareArray(a, b)).toBe(true);
    });

    test("should compare mixed type arrays", () => {
      const a = [1, "two", true];
      const b = [1, "two", true];
      const c = [1, "two", false];
      expect(compareArray(a, b)).toBe(true);
      expect(compareArray(a, c)).toBe(false);
    });
  });

  describe("log", () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    test("should log to console with prefix", () => {
      log("test message");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "mini-graph-card: ",
        "test message"
      );
    });

    test("should handle error objects", () => {
      const error = new Error("test error");
      log(error);
      expect(consoleWarnSpy).toHaveBeenCalledWith("mini-graph-card: ", error);
    });

    test("should handle objects", () => {
      const obj = { key: "value" };
      log(obj);
      expect(consoleWarnSpy).toHaveBeenCalledWith("mini-graph-card: ", obj);
    });
  });
});
