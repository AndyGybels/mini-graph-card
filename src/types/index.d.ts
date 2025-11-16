import { Connection } from "home-assistant-js-websocket";
import {
  HomeAssistant,
  LovelaceCardConfig,
} from "home-assistant-frontend-types";

export type MiniGraphCardHomeAssistant = HomeAssistant & {
  __entityStore__: EntityStore;
};

type SubscriptionUnsubscribe = () => Promise<void>;

export type EntityConfig =
  | string
  | {
      entity: string;
      name?: string;
      show_state?: boolean;
    };

export type MiniGraphCardConfig = LovelaceCardConfig & {
  hours_to_show: number;
  smoothing: boolean;
  entities: EntityConfig[];
};

export interface ColorThreshold {
  color: string;
  value: number;
}

export interface ColorThresholdInput {
  color?: string;
  value?: number | null;
}

export interface EntityConfig {
  entity: string;
  name?: string;
  color?: string;
  show_state?: boolean;
  show_indicator?: boolean;
  show_graph?: boolean;
  show_line?: boolean;
  show_fill?: boolean;
  show_points?: boolean;
  show_legend?: boolean;
  show_legend_state?: boolean;
  line_color?: string;
  line_width?: number;
  unit?: string;
  aggregate_func?: string;
  group_by?: string;
  smoothing?: boolean;
  state_adaptive_color?: boolean;
  fixed_value?: boolean;
  y_axis?: "primary" | "secondary";
  attribute?: string;
  index?: number;
}

export interface StateMapItem {
  value: string | number;
  label: string;
}

export interface TapAction {
  action: string;
  entity?: string;
  [key: string]: any;
}

export interface ShowConfig {
  name?: boolean | string;
  icon?: boolean;
  state?: boolean | string;
  graph?: boolean | string;
  fill?: boolean | string;
  points?: boolean | string;
  legend?: boolean;
  extrema?: boolean;
  average?: boolean;
  labels?: boolean | string;
  labels_secondary?: boolean | string;
  loading_indicator?: boolean;
  icon_adaptive_color?: boolean;
  name_adaptive_color?: boolean;
  [key: string]: any;
}

export type TypeOfTransition = "smooth" | "hard";
