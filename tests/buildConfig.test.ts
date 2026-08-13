import buildConfig from "../src/buildConfig";
import { FONT_SIZE, DEFAULT_COLORS } from "../src/const";

const c = (cfg: any) => ({ type: "custom:mini-graph-card", ...cfg });

describe("buildConfig", () => {
  describe("✅ Working Tests - Basic Config", () => {
    test("accepts minimal config", () => {
      const config = buildConfig(c({ entities: ["sensor.test"] }));
      expect(config).toBeDefined();
      expect(config.entities).toHaveLength(1);
    });

    test("normalizes string entities to objects with an index", () => {
      const config = buildConfig(c({ entities: ["sensor.test"] }));
      expect(config.entities[0]).toEqual({ entity: "sensor.test", index: 0 });
    });

    test("preserves entity object options and adds an index", () => {
      const config = buildConfig(
        c({
          entities: [
            "sensor.first",
            { entity: "sensor.second", name: "Second", show_state: true },
          ],
        })
      );
      expect(config.entities[1]).toEqual({
        entity: "sensor.second",
        name: "Second",
        show_state: true,
        index: 1,
      });
    });

    test("sets default hours_to_show", () => {
      const config = buildConfig(c({ entities: ["sensor.test"] }));
      expect(config.hours_to_show).toBe(24);
    });

    test("sets default line_color", () => {
      const config = buildConfig(c({ entities: ["sensor.test"] }));
      expect(config.line_color).toEqual(DEFAULT_COLORS);
    });

    test("overrides user config values", () => {
      const config = buildConfig(
        c({
          entities: ["sensor.test"],
          hours_to_show: 48,
        })
      );
      expect(config.hours_to_show).toBe(48);
    });
  });

  describe("⏳ TODO - Entity Normalization", () => {
    test.todo("should normalize mixed entity formats");
    test.todo("should preserve entity-specific config (color, name, etc)");
    test.todo("should handle entity with attributes");
    test.todo("should assign entity index");
  });

  describe("⏳ TODO - Show Options Merging", () => {
    test.todo("should merge show options with DEFAULT_SHOW");
    test.todo("should override individual show properties");
    test.todo("should handle show.graph = 'line'");
    test.todo("should handle show.graph = 'bar'");
    test.todo("should handle show.labels = 'hover'");
    test.todo("should handle show.labels = true/false");
  });

  describe("⏳ TODO - Color Configuration", () => {
    test.todo("should convert single line_color to array");
    test.todo("should keep line_color array");
    test.todo("should process color_thresholds");
    test.todo("should sort color_thresholds descending");
    test.todo("should compute threshold interpolation (smooth)");
    test.todo("should compute threshold steps (hard)");
    test.todo("should handle empty color_thresholds");
  });

  describe("⏳ TODO - State Map Processing", () => {
    test.todo("should normalize string state_map to objects");
    test.todo("should preserve state_map objects");
    test.todo("should add missing labels");
    test.todo("should handle empty state_map");
  });

  describe("⏳ TODO - Font & Sizing", () => {
    test.todo("should calculate font_size from percentage");
    test.todo("should set font_size_header");
    test.todo("should handle height configuration");
    test.todo("should handle line_width");
  });

  describe("⏳ TODO - Time & Date Configuration", () => {
    test.todo("should configure hour24 format");
    test.todo("should configure 12-hour format");
    test.todo("should add day/weekday for > 24 hours");
    test.todo("should not add day/weekday for <= 24 hours");
    test.todo("should handle custom format options");
  });

  describe("⏳ TODO - Aggregation Settings", () => {
    test.todo("should adjust points_per_hour for 'date' grouping");
    test.todo("should adjust points_per_hour for 'hour' grouping");
    test.todo("should keep points_per_hour for 'interval' grouping");
    test.todo("should set aggregate_func (avg, min, max, sum, etc)");
  });

  describe("⏳ TODO - Bar Graph Optimization", () => {
    test.todo("should adjust points_per_hour to fit MAX_BARS");
    test.todo("should handle multiple entities in bar mode");
    test.todo("should calculate optimal bar count");
  });

  describe("⏳ TODO - Tap Actions", () => {
    test.todo("should set default tap_action to more-info");
    test.todo("should override tap_action");
    test.todo("should handle tap_action.entity");
  });

  describe("⏳ TODO - Advanced Options", () => {
    test.todo("should handle cache configuration");
    test.todo("should handle update_interval");
    test.todo("should handle animate setting");
    test.todo("should handle smoothing setting");
    test.todo("should handle group setting");
    test.todo("should handle value_factor");
    test.todo("should handle decimals");
    test.todo("should handle lower_bound/upper_bound");
    test.todo("should handle lower_bound_secondary/upper_bound_secondary");
  });

  describe("⏳ TODO - Validation & Errors", () => {
    test.todo("should throw error if entities is not an array");
    test.todo("should throw error for deprecated line_color_above");
    test.todo("should throw error for deprecated line_color_below");
    test.todo("should validate entity format");
  });
});
