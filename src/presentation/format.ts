import { stateIcon } from "custom-card-helpers";
import {
  EntityConfig,
  MiniGraphCardConfig,
  StoreEntityState,
} from "~/types";
import { ICONS } from "~/const";
import { log } from "~/utils";

/**
 * Format a raw state for display: state_map labels, decimals,
 * value_factor and locale-aware number formatting.
 */
export function formatState(
  config: MiniGraphCardConfig,
  language: string,
  inState: string | number | undefined
): string | number {
  if (config.state_map.length > 0) {
    const stateMap =
      typeof inState === "number" && Number.isInteger(inState)
        ? config.state_map[inState]
        : config.state_map.find((state) => state.value === inState);

    if (stateMap) {
      return stateMap.label;
    } else {
      log(`value [${inState}] not found in state_map`);
    }
  }

  let state: number;
  if (typeof inState === "string") {
    state = parseFloat(inState.replace(/,/g, "."));
  } else {
    state = Number(inState);
  }
  const dec = config.decimals;
  const value_factor = 10 ** config.value_factor;

  if (dec === undefined || Number.isNaN(dec) || Number.isNaN(state)) {
    return numberFormat(
      Math.round(state * value_factor * 100) / 100,
      language
    );
  }

  const x = 10 ** dec;
  return numberFormat(
    (Math.round(state * value_factor * x) / x).toFixed(dec),
    language,
    dec
  );
}

export function numberFormat(
  num: number | string,
  language: string,
  dec?: number
): string {
  if (!Number.isNaN(Number(num)) && Intl)
    return new Intl.NumberFormat(language, {
      minimumFractionDigits: dec,
    }).format(Number(num));
  return num.toString();
}

/** Unit of measurement: per-entity unit → card unit → HA attribute */
export function formatUom(
  config: MiniGraphCardConfig,
  entityConfig: EntityConfig,
  entity: StoreEntityState | undefined
): string {
  if (entityConfig.unit !== undefined) return entityConfig.unit;
  if (config.unit !== undefined) return config.unit;
  if (!entityConfig.attribute) {
    return entity?.attributes?.unit_of_measurement || "";
  }
  return "";
}

/** Display name: configured name → friendly_name → entity id */
export function formatName(
  entityConfig: EntityConfig,
  entity: StoreEntityState | undefined
): string {
  return (
    entityConfig.name ||
    entity?.attributes?.friendly_name ||
    entity?.entity_id ||
    entityConfig.entity
  );
}

export function computeIcon(
  config: MiniGraphCardConfig,
  entity: StoreEntityState | undefined
): string {
  return (
    config.icon ||
    entity?.attributes?.icon ||
    (entity && stateIcon(entity)) ||
    ICONS.temperature
  );
}
