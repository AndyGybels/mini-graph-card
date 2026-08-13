import {
  EntityConfig,
  EntityHistoryState,
  JsonValue,
  MiniGraphCardConfig,
} from "~/types";

/** Walk a dot-separated attribute path through a JSON object */
export function getObjectAttr(
  obj: Record<string, JsonValue> | undefined,
  path: string
): string | number | undefined {
  const value = path
    .split(".")
    .reduce<JsonValue | undefined>(
      (res, key) =>
        res && typeof res === "object" && !Array.isArray(res)
          ? res[key]
          : Array.isArray(res)
            ? res[Number(key)]
            : undefined,
      obj
    );
  // configured attribute paths are expected to point at scalar values;
  // non-scalars are dropped by the NaN filtering downstream
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * Convert raw store history into graphable items: resolve attribute
 * values, apply state_map conversions and drop non-numeric states.
 */
export function processHistory(
  config: MiniGraphCardConfig,
  entityConfig: EntityConfig,
  history: EntityHistoryState[]
): EntityHistoryState[] {
  let items = history;

  if (entityConfig.attribute) {
    items = items.map((item) => ({
      ...item,
      s: String(getObjectAttr(item.a, entityConfig.attribute!)),
    }));
  }

  if (config.state_map.length > 0) {
    items = items.map((item) => {
      const mapped = config.state_map.findIndex((s) => s.value === item.s);
      return mapped === -1 ? item : { ...item, s: String(mapped) };
    });
  }

  return items.filter((item) => !Number.isNaN(parseFloat(item.s)));
}
