import { css, html, LitElement, TemplateResult, svg } from "lit";
import { GraphViewModel } from "~/card/viewModel";
import { displayedState } from "~/card/viewModelHelpers";
import { computeColor } from "~/presentation/color";
import { formatState, formatUom } from "~/presentation/format";
import { Tooltip } from "~/types";
import { define, iconStyles, iconTemplate, sharedStyles } from "./shared";

/**
 * Current-state row: the primary state (which shows the tooltip value
 * while hovering the graph), secondary entity states, and optionally
 * the icon when it's aligned to the state.
 *
 * Events: `popup-requested` (detail: entity index).
 */
export class MgcStates extends LitElement {
  vm!: GraphViewModel;
  tooltip: Tooltip = {};
  color?: string;
  language = "en";

  static get properties() {
    return {
      vm: { attribute: false },
      tooltip: { attribute: false },
      color: { attribute: false },
      language: { type: String },
    };
  }

  static styles = [
    sharedStyles,
    iconStyles,
    css`
      :host {
        display: block;
      }
      .states {
        align-items: flex-start;
        font-weight: 300;
        justify-content: space-between;
        flex-wrap: nowrap;
      }
      .states .icon {
        align-self: center;
        margin-left: 0;
      }
      .states[loc="center"] {
        justify-content: space-evenly;
      }
      .states[loc="right"] > .state {
        margin-left: auto;
        order: 2;
      }
      .states[loc="center"] .states--secondary,
      .states[loc="right"] .states--secondary {
        margin-left: 0;
      }
      .states[loc="center"] .states--secondary {
        align-items: center;
      }
      .states[loc="right"] .states--secondary {
        align-items: flex-start;
      }
      .states[loc="center"] .state__time {
        left: 50%;
        transform: translateX(-50%);
      }
      .states > .icon > ha-icon {
        height: 2em !important;
        width: 2em !important;
      }
      .states--secondary {
        display: flex;
        flex-flow: column;
        flex-wrap: wrap;
        align-items: flex-end;
        min-width: 0;
        margin-left: 1.4em;
      }
      .states--secondary:empty {
        display: none;
      }
      .state {
        position: relative;
        display: flex;
        flex-wrap: nowrap;
        max-width: 100%;
        min-width: 0;
      }
      .state > svg {
        align-self: center;
        border-radius: 100%;
      }
      .state--small {
        font-size: 0.6em;
        margin-bottom: 0.6rem;
        flex-wrap: nowrap;
      }
      .state--small > svg {
        position: absolute;
        left: -1.6em;
        align-self: center;
        height: 1em;
        width: 1em;
        border-radius: 100%;
        margin-right: 1em;
      }
      .state--small:last-child {
        margin-bottom: 0;
      }
      .states--secondary > :only-child {
        font-size: 1em;
        margin-bottom: 0;
      }
      .states--secondary > :only-child svg {
        display: none;
      }
      .state__value {
        display: inline-block;
        font-size: 2.4em;
        margin-right: 0.25rem;
        line-height: 1.2em;
      }
      .state__uom {
        flex: 1;
        align-self: flex-end;
        display: inline-block;
        font-size: 1.4em;
        font-weight: 400;
        line-height: 1.6em;
        margin-top: 0.1em;
        opacity: 0.6;
        vertical-align: bottom;
      }
      .state--small .state__uom {
        flex: 1;
      }
      .state__time {
        font-size: 0.95rem;
        font-weight: 500;
        bottom: -1.1rem;
        left: 0;
        opacity: 0.75;
        position: absolute;
        white-space: nowrap;
        animation: fade 0.15s cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      .states[loc="right"] .state__time {
        left: initial;
        right: 0;
      }
      @keyframes fade {
        0% {
          opacity: 0;
        }
      }
    `,
  ];

  render() {
    const { config } = this.vm;
    if (!config.show.state) return html``;

    return html`
      <div class="states flex" part="states" loc=${config.align_state}>
        ${this.renderState(0)}
        <div class="states--secondary">
          ${config.entities.map((_, i) => (i > 0 && this.renderState(i)) || "")}
        </div>
        ${config.align_icon === "state" ? iconTemplate(this.vm, this.color) : ""}
      </div>
    `;
  }

  private renderState(id: number): TemplateResult | undefined {
    const { config } = this.vm;
    const isPrimary = id === 0;
    if (!isPrimary && !config.entities[id].show_state) return;

    const state = displayedState(this.vm, id);
    // use tooltip data for the main state element, if a tooltip is active
    const { entity: tooltipEntity, value: tooltipValue } = this.tooltip;
    const isTooltip = isPrimary && tooltipEntity !== undefined;
    const value = isTooltip ? tooltipValue : state;
    const entity = isTooltip ? tooltipEntity! : id;
    const entityConfig = config.entities[entity];

    return html`
      <div
        class="state ${!isPrimary ? "state--small" : ""}"
        part="state"
        @click=${(e: Event) => this.requestPopup(e, id)}
        style=${entityConfig.state_adaptive_color
          ? `color: ${computeColor(config, entity, value)}`
          : ""}
      >
        ${entityConfig.show_indicator ? this.renderIndicator(value, entity) : ""}
        <span class="state__value ellipsis" part="state-value">
          ${formatState(config, this.language, value)}
        </span>
        <span class="state__uom ellipsis" part="state-uom">
          ${formatUom(config, config.entities[entity], this.vm.entities[entity])}
        </span>
        ${(isPrimary && this.renderStateTime()) || ""}
      </div>
    `;
  }

  private renderIndicator(state: string | number | undefined, index: number) {
    return svg`
      <svg width='10' height='10'>
        <rect width='10' height='10' fill=${computeColor(this.vm.config, index, state)} />
      </svg>
    `;
  }

  private renderStateTime() {
    if (this.tooltip.value === undefined) return;
    return html`
      <div class="state__time" part="state-time">
        ${this.tooltip.label
          ? html`<span class="tooltip--label">${this.tooltip.label}</span>`
          : html`
              <span>${this.tooltip.time?.[0]}</span> -
              <span>${this.tooltip.time?.[1]}</span>
            `}
      </div>
    `;
  }

  private requestPopup(e: Event, index: number) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("popup-requested", {
        detail: { index },
        bubbles: true,
        composed: true,
      })
    );
  }
}

define("mini-graph-card-states", MgcStates);
