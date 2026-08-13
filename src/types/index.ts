import {
  HomeAssistant,
  LovelaceCardConfig,
} from "home-assistant-frontend-types";
import { EntityHistoryState as FrontendEntityHistoryState } from "home-assistant-frontend-types/frontend/src/data/history";

export type { HomeAssistant };

/**
 * History entry as returned by the HA websocket API
 * (`history/history_during_period` with `minimal_response`).
 *
 * Derived from the frontend's own type; we only tighten `attributes`
 * from `any` to `JsonValue` since the payload is JSON-serialized.
 */
export type EntityHistoryState = Omit<FrontendEntityHistoryState, "a"> & {
  /** attributes */
  a: Record<string, JsonValue>;
};

/** Response shape: history items keyed by entity id */
export type HistoryStates = Record<string, EntityHistoryState[]>;

/** Entity state as served by the EntityStore: HA state + history window */
export type StoreEntityState = import("home-assistant-js-websocket").HassEntity & {
  history: EntityHistoryState[];
  historyLoaded: boolean;
};

/** Active tooltip state, owned by the root card (mediator) */
export interface Tooltip {
  value?: string | number;
  entity?: number;
  time?: [string, string];
  index?: number;
  label?: string | null;
}

/** One min/avg/max row in the info section */
export interface InfoEntry {
  type: "min" | "avg" | "max";
  state: string | number;
  last_changed?: number;
}

/**
 * Any value that can arrive over the websocket / from YAML config —
 * i.e. anything JSON-serializable. More precise than `unknown`: it rules
 * out functions, Dates, Maps etc., but member access still requires
 * narrowing since the concrete shape is decided by the producer.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AggregateFuncName =
  | "avg"
  | "median"
  | "max"
  | "min"
  | "first"
  | "last"
  | "sum"
  | "delta"
  | "diff";

export type GroupBy = "interval" | "month" | "date" | "hour";

/**
 * Per-entity configuration. User config may provide a bare entity-id string;
 * buildConfig() normalizes those to objects and assigns `index`.
 */
export interface EntityConfig {
  entity: string;
  /** position in the entities list, assigned by buildConfig() */
  index?: number;
  name?: string;
  color?: string;
  unit?: string;
  attribute?: string;
  aggregate_func?: AggregateFuncName;
  smoothing?: boolean;
  y_axis?: "primary" | "secondary";
  fixed_value?: boolean;
  show_state?: boolean;
  show_indicator?: boolean;
  show_graph?: boolean;
  show_line?: boolean;
  show_fill?: boolean;
  show_points?: boolean;
  show_legend?: boolean;
  show_legend_state?: boolean;
  state_adaptive_color?: boolean;
}

export interface StateMapItem {
  value: string | number;
  label: string;
}

export interface TapAction {
  action: "more-info" | "navigate" | "call-service" | "url" | "fire-dom-event" | "none";
  entity?: string;
  navigation_path?: string;
  service?: string;
  service_data?: Record<string, unknown>;
  url?: string;
  [key: string]: unknown;
}

export interface ShowConfig {
  name: boolean;
  icon: boolean;
  state: boolean | "last";
  graph: "line" | "bar" | false;
  fill: boolean | "fade";
  points: boolean | "hover";
  legend: boolean;
  average: boolean;
  extrema: boolean;
  labels: boolean | "hover";
  labels_secondary: boolean | "hover";
  name_adaptive_color: boolean;
  icon_adaptive_color: boolean;
  loading_indicator?: boolean;
  [key: string]: unknown;
}

export interface ColorThreshold {
  color: string;
  value: number;
}

export interface ColorThresholdInput {
  color?: string;
  value?: number | null;
}

export type TypeOfTransition = "smooth" | "hard";

/**
 * The fully-built card configuration produced by buildConfig().
 */
export type MiniGraphCardConfig = LovelaceCardConfig & {
  entities: EntityConfig[];
  animate?: boolean;
  hour24: boolean;
  font_size: number;
  font_size_header: number;
  height: number;
  hours_to_show: number;
  points_per_hour: number;
  aggregate_func: AggregateFuncName;
  group_by: GroupBy;
  line_color: string[];
  color_thresholds: ColorThreshold[];
  color_thresholds_transition: TypeOfTransition;
  line_width: number;
  bar_spacing: number;
  compress: boolean;
  smoothing: boolean;
  state_map: StateMapItem[];
  cache: boolean;
  value_factor: number;
  tap_action: TapAction;
  show: ShowConfig;
  format: Intl.DateTimeFormatOptions;
  name?: string;
  icon?: string;
  icon_image?: string;
  unit?: string;
  decimals?: number;
  group?: boolean;
  align_header?: string;
  align_icon?: string;
  align_state?: string;
  logarithmic?: boolean;
  update_interval?: number;
  lower_bound?: number | string;
  upper_bound?: number | string;
  min_bound_range?: number | string;
  lower_bound_secondary?: number | string;
  upper_bound_secondary?: number | string;
  min_bound_range_secondary?: number | string;
};
