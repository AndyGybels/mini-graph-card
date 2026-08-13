import { css, html, LitElement, svg } from "lit";
import { GraphViewModel } from "~/card/viewModel";
import { displayedState, visibleLegends } from "~/card/viewModelHelpers";
import { computeColor } from "~/presentation/color";
import { formatName, formatState, formatUom } from "~/presentation/format";
import { define, sharedStyles } from "./shared";

/**
 * Legend row: one clickable item per visible entity.
 *
 * Events: `tooltip-changed` (detail: {entity, index, value, label} | null),
 * `popup-requested` (detail: {index}).
 */
export class MgcLegend extends LitElement {
  vm!: GraphViewModel;
  language = "en";

  static get properties() {
    return {
      vm: { attribute: false },
      language: { type: String },
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .graph__legend {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        padding-top: 16px;
        flex-wrap: wrap;
      }
      .graph__legend__item {
        cursor: pointer;
        display: flex;
        min-width: 0;
        margin: 0.4em;
        align-items: center;
      }
      .graph__legend__item span {
        opacity: 0.75;
        margin-left: 0.4em;
      }
      .graph__legend__item svg {
        border-radius: 100%;
        min-width: 10px;
      }
    `,
  ];

  render() {
    const legends = visibleLegends(this.vm);
    if (legends.length <= 1 || !this.vm.config.show.legend) return html``;

    return html`
      <div class="graph__legend" part="legend">
        ${legends.map((entity) => {
          const index = entity.index!;
          const state = displayedState(this.vm, index);
          return html`
            <div
              class="graph__legend__item"
              part="legend-item"
              @click=${(e: Event) => this.requestPopup(e, index)}
              @mouseenter=${() => this.setTooltip(index, state)}
              @mouseleave=${() => this.clearTooltip()}
            >
              ${svg`
                <svg width='10' height='10'>
                  <rect width='10' height='10' fill=${computeColor(this.vm.config, index, state)} />
                </svg>
              `}
              <span class="ellipsis">${this.computeLegend(index, state)}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private computeLegend(
    index: number,
    state: string | number | undefined
  ): string {
    const { config } = this.vm;
    let legend = formatName(config.entities[index], this.vm.entities[index]);

    const { show_legend_state = false } = config.entities[index];
    if (show_legend_state) {
      legend += ` (${formatState(config, this.language, state)}`;
      if (state !== "unavailable") {
        const uom = formatUom(
          config,
          config.entities[index],
          this.vm.entities[index]
        );
        if (!["%", ""].includes(uom)) legend += " ";
        legend += `${uom}`;
      }
      legend += ")";
    }

    return legend;
  }

  private setTooltip(entity: number, value: string | number | undefined) {
    this.dispatchEvent(
      new CustomEvent("tooltip-changed", {
        detail: { entity, index: -1, value, label: "Current" },
        bubbles: true,
        composed: true,
      })
    );
  }

  private clearTooltip() {
    this.dispatchEvent(
      new CustomEvent("tooltip-changed", {
        detail: null,
        bubbles: true,
        composed: true,
      })
    );
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

define("mini-graph-card-legend", MgcLegend);
