import { ColorThresholdInput, EntityConfig, StateMapItem } from "../types";

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if an entity config is a string
 */
export function isEntityString(
  entity: string | EntityConfig
): entity is string {
  return typeof entity === "string";
}

/**
 * Type guard to check if an entity config is an EntityConfig object
 */
export function isEntityObject(
  x: EntityConfig
): x is Exclude<EntityConfig, string> {
  return typeof x === "object" && x !== null && "entity" in x;
}

/**
 * Type guard to check if a state map item is a string
 */
export function isStateMapString(
  state: string | StateMapItem
): state is string {
  return typeof state === "string";
}

/**
 * Type guard to check if a state map item is a StateMapItem object
 */
export function isStateMapItem(
  state: string | StateMapItem
): state is StateMapItem {
  return typeof state === "object" && "value" in state;
}

/**
 * Type guard to check if a color threshold input is a string
 */
export function isColorThresholdString(
  threshold: string | ColorThresholdInput
): threshold is string {
  return typeof threshold === "string";
}

/**
 * Type guard to check if a color threshold input is a ColorThresholdInput object
 */
export function isColorThresholdInput(
  threshold: string | ColorThresholdInput
): threshold is ColorThresholdInput {
  return typeof threshold === "object" && threshold !== null;
}
