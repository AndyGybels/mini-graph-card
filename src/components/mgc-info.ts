import { css, html, LitElement } from "lit";
import { GraphViewModel } from "~/card/viewModel";
import { formatState, formatUom } from "~/presentation/format";
import { getTime } from "~/utils";
import { define, sharedStyles } from "./shared";

/**
 * Min/avg/max info section for the primary entity.
 */
export class MgcInfo extends LitElement {
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
      .info {
        justify-content: space-between;
      }
      .info__item {
        display: flex;
        flex-flow: column;
        text-align: center;
      }
      .info__item:last-child {
        align-items: flex-end;
        text-align: right;
      }
      .info__item:first-child {
        align-items: flex-start;
        text-align: left;
      }
      .info__item__type {
        text-transform: capitalize;
        font-weight: 500;
        opacity: 0.9;
      }
      .info__item__time,
      .info__item__value {
        opacity: 0.75;
      }
    `,
  ];

  render() {
    const { config, abs, entities } = this.vm;
    if (abs.length === 0) return html``;

    return html`
      <div class="info flex" part="info">
        ${abs.map(
          (entry) => html`
            <div class="info__item" part="info-item">
              <span class="info__item__type">${entry.type}</span>
              <span class="info__item__value">
                ${formatState(config, this.language, entry.state)}
                ${formatUom(config, config.entities[0], entities[0])}
              </span>
              <span class="info__item__time">
                ${entry.type !== "avg" && entry.last_changed !== undefined
                  ? getTime(
                      new Date(entry.last_changed),
                      config.format,
                      this.language
                    )
                  : ""}
              </span>
            </div>
          `
        )}
      </div>
    `;
  }
}

define("mini-graph-card-info", MgcInfo);
