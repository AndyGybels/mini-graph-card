import { css, html, LitElement } from "lit";
import { LovelaceCardConfig } from "home-assistant-frontend-types";
import Graph from "~/graph";
import buildConfig from "~/buildConfig";
import handleClick from "~/handleClick";
import { EntityStore, getEntityStore } from "~/entityStore";
import { computeViewModel, GraphViewModel } from "~/card/viewModel";
import {
  EntitySubscription,
  IntervalController,
} from "~/controllers/entitySubscription";
import { computeColor } from "~/presentation/color";
import { computeTooltip } from "~/presentation/tooltip";
import { displayedState } from "~/card/viewModelHelpers";
import { getFirstDefinedItem, compareArray, createThrottle } from "~/utils";
import { ONE_HOUR } from "~/const";
import {
  HomeAssistant,
  MiniGraphCardConfig,
  StoreEntityState,
  Tooltip,
} from "~/types";
import { define, sharedStyles } from "./shared";
import "./mgc-header";
import "./mgc-states";
import "./mgc-graph";
import "./mgc-legend";
import "./mgc-info";
import "./mgc-warnings";

interface TooltipSource {
  entity: number;
  index: number;
  value: string | number;
  label?: string | null;
}

/**
 * Root card: owns the store subscription, the Graph instances and all
 * shared state (view-model, tooltip, hover). Mediates between the
 * subcomponents: properties flow down, events bubble up.
 */
export class MiniGraphCard extends LitElement {
  config?: MiniGraphCardConfig;
  viewModel?: GraphViewModel;
  tooltip: Tooltip = {};

  private _hass?: HomeAssistant;
  private _rawConfig?: LovelaceCardConfig;
  private entityStore?: EntityStore;
  private graphs: Graph[] = [];
  private cardHover = false;
  private updateQueued = false;
  private throttledUpdate = createThrottle(() => this.updateData(), 1000);

  private subscription = new EntitySubscription(this, {
    store: () => this.entityStore,
    config: () => this._rawConfig,
    onUpdate: () => this.scheduleDataUpdate(),
  });

  // advance the graph window over time, even without state changes
  private windowTicker = new IntervalController(
    this,
    () => this.updateData(),
    () =>
      this.config?.update_interval
        ? this.config.update_interval * 1000
        : (1 / (this.config?.points_per_hour ?? 0.5)) * ONE_HOUR
  );

  static get properties() {
    return {
      config: { attribute: false },
      viewModel: { attribute: false },
      tooltip: { attribute: false },
      cardHover: { attribute: false, state: true },
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }
      ha-card {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 16px 0 0 0;
        position: relative;
        overflow: hidden;
      }
      ha-card > mini-graph-card-header,
      ha-card > mini-graph-card-states,
      ha-card > mini-graph-card-info {
        padding: 0px 16px 16px 16px;
      }
      ha-card > mini-graph-card-legend {
        padding: 0 16px 8px 16px;
      }
      ha-card > mini-graph-card-graph {
        margin-top: auto;
      }
      ha-card[group] {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      ha-card[group] > mini-graph-card-header,
      ha-card[group] > mini-graph-card-states,
      ha-card[group] > mini-graph-card-info,
      ha-card[group] > mini-graph-card-legend {
        padding-left: 0;
        padding-right: 0;
      }
      ha-card[hover] {
        cursor: pointer;
      }
    `,
  ];

  get lang(): string {
    return this._hass?.locale?.language ?? this._hass?.language ?? "en";
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    // one shared store per websocket connection
    this.entityStore = getEntityStore(hass);
    this.subscription.sync();
  }

  setConfig(config: LovelaceCardConfig) {
    const entitiesChanged = !compareArray(
      this._rawConfig?.entities ?? [],
      config.entities ?? []
    );

    this._rawConfig = config;
    this.config = buildConfig(config);

    if (this.graphs.length === 0 || entitiesChanged) {
      this.createGraphs();
      if (entitiesChanged) this.subscription.sync(true);
    }
  }

  getCardSize() {
    return 3;
  }

  render() {
    const { config, viewModel } = this;
    if (!config || !this._hass) return html``;

    if (
      viewModel &&
      config.entities.some((_, index) => viewModel.entities[index] === undefined)
    ) {
      return html`
        <mini-graph-card-warnings
          .entities=${config.entities}
          .states=${viewModel.entities}
        ></mini-graph-card-warnings>
      `;
    }

    if (!viewModel) return html``;

    const color = this.currentColor(viewModel);

    return html`
      <ha-card
        class="flex"
        part="card"
        ?group=${config.group}
        ?hover=${config.tap_action.action !== "none"}
        style="font-size: ${config.font_size}px;"
        @click=${(e: Event) => this.onCardClick(e)}
        @mouseenter=${() => (this.cardHover = true)}
        @mouseleave=${() => (this.cardHover = false)}
        @tooltip-changed=${(e: CustomEvent<TooltipSource | null>) =>
          this.onTooltipChanged(e)}
        @popup-requested=${(e: CustomEvent<{ index: number }>) =>
          this.onPopupRequested(e)}
      >
        <mini-graph-card-header
          exportparts="header, name, icon"
          .vm=${viewModel}
          .tooltip=${this.tooltip}
          .color=${color}
        ></mini-graph-card-header>
        <mini-graph-card-states
          exportparts="states, state, state-value, state-uom, state-time, icon"
          .vm=${viewModel}
          .tooltip=${this.tooltip}
          .color=${color}
          .language=${this.lang}
        ></mini-graph-card-states>
        <mini-graph-card-info
          exportparts="info, info-item"
          .vm=${viewModel}
          .language=${this.lang}
        ></mini-graph-card-info>
        ${config.show.graph
          ? html`
              <mini-graph-card-legend
                exportparts="legend, legend-item"
                .vm=${viewModel}
                .language=${this.lang}
              ></mini-graph-card-legend>
              <mini-graph-card-graph
                exportparts="graph, labels, labels-secondary"
                .vm=${viewModel}
                .tooltip=${this.tooltip}
                .language=${this.lang}
                ?points=${config.show.points === "hover"}
                ?labels=${config.show.labels === "hover"}
                ?labels-secondary=${config.show.labels_secondary === "hover"}
                ?fill=${Boolean(config.show.graph && config.show.fill)}
                ?gradient=${config.color_thresholds.length > 0}
                ?card-hover=${this.cardHover}
              ></mini-graph-card-graph>
            `
          : ""}
      </ha-card>
    `;
  }

  // -----------------------------------------------------------------
  // Data flow
  // -----------------------------------------------------------------
  private createGraphs() {
    const config = this.config!;
    this.graphs = config.entities.map(
      (entity) =>
        new Graph(
          500,
          config.height,
          [config.show.fill ? 0 : config.line_width, config.line_width],
          config.hours_to_show,
          config.points_per_hour,
          entity.aggregate_func || config.aggregate_func,
          config.group_by,
          getFirstDefinedItem(
            entity.smoothing,
            config.smoothing,
            // turn off for binary sensor by default
            !entity.entity.startsWith("binary_sensor.")
          ),
          config.logarithmic
        )
    );
  }

  private scheduleDataUpdate() {
    if (this.viewModel?.ready) {
      // steady state: run now, coalesce bursts into one trailing update
      this.throttledUpdate();
    } else if (!this.updateQueued) {
      // still loading: recompute as soon as data lands (per-microtask batch)
      this.updateQueued = true;
      queueMicrotask(() => {
        this.updateQueued = false;
        this.updateData();
      });
    }
  }

  private updateData() {
    const config = this.config;
    const configId = this.subscription.configId;
    if (!config || !configId || !this.entityStore) return;

    const entities = config.entities.map((entityConf) => {
      const state = this.entityStore!.getState(
        configId,
        entityConf.entity
      ) as StoreEntityState;
      return state.entity_id ? state : undefined;
    });

    this.viewModel = computeViewModel(
      config,
      entities,
      this.graphs,
      this.viewModel?.bound,
      this.viewModel?.boundSecondary
    );
  }

  // -----------------------------------------------------------------
  // Mediation
  // -----------------------------------------------------------------
  private currentColor(vm: GraphViewModel): string {
    const value =
      this.tooltip.value !== undefined
        ? this.tooltip.value
        : displayedState(vm, 0);
    return computeColor(vm.config, this.tooltip.entity || 0, value);
  }

  private onTooltipChanged(e: CustomEvent<TooltipSource | null>) {
    e.stopPropagation();
    if (e.detail === null) {
      this.tooltip = {};
      return;
    }
    const { entity, index, value, label } = e.detail;
    this.tooltip = computeTooltip(
      this.config!,
      this.lang,
      entity,
      index,
      value,
      label ?? null
    );
  }

  private onPopupRequested(e: CustomEvent<{ index: number }>) {
    e.stopPropagation();
    this.openPopup(
      this.viewModel?.entities[e.detail.index]?.entity_id ??
        this.config!.entities[e.detail.index]?.entity
    );
  }

  private onCardClick(e: Event) {
    e.stopPropagation();
    this.openPopup(
      this.config!.tap_action.entity ?? this.viewModel?.entities[0]?.entity_id
    );
  }

  private openPopup(entityId: string | undefined) {
    handleClick(
      this,
      this._hass!,
      this.config!,
      this.config!.tap_action,
      entityId
    );
  }
}

define("mini-graph-card", MiniGraphCard);
