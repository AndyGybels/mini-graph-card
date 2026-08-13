import { css, html, LitElement } from "lit";
import { GraphViewModel } from "~/card/viewModel";
import { formatName } from "~/presentation/format";
import { Tooltip } from "~/types";
import { define, iconStyles, iconTemplate, sharedStyles } from "./shared";

/**
 * Card header: name (switches to the hovered entity while a tooltip is
 * active) and the entity icon, unless the icon is aligned to the state.
 */
export class MgcHeader extends LitElement {
  vm!: GraphViewModel;
  tooltip: Tooltip = {};
  color?: string;

  static get properties() {
    return {
      vm: { attribute: false },
      tooltip: { attribute: false },
      color: { attribute: false },
    };
  }

  static styles = [
    sharedStyles,
    iconStyles,
    css`
      :host {
        display: block;
      }
      .header {
        justify-content: space-between;
      }
      .header[loc="center"] {
        justify-content: space-around;
      }
      .header[loc="left"] {
        align-self: flex-start;
      }
      .header[loc="right"] {
        align-self: flex-end;
      }
      .name {
        align-items: center;
        min-width: 0;
        letter-spacing: var(--mcg-title-letter-spacing, normal);
      }
      .name > span {
        font-size: 1.2em;
        font-weight: var(--mcg-title-font-weight, 500);
        max-height: 1.4em;
        min-height: 1.4em;
        opacity: 0.65;
      }
    `,
  ];

  render() {
    const { config } = this.vm;
    const { show, align_icon, align_header, font_size_header } = config;

    if (!(show.name || (show.icon && align_icon !== "state"))) return html``;

    return html`
      <div
        class="header flex"
        part="header"
        loc=${align_header}
        style="font-size: ${font_size_header}px;"
      >
        ${this.renderName()}
        ${align_icon !== "state" ? iconTemplate(this.vm, this.color) : ""}
      </div>
    `;
  }

  private renderName() {
    const { config } = this.vm;
    if (!config.show.name) return "";

    const name =
      this.tooltip.entity !== undefined
        ? formatName(
            config.entities[this.tooltip.entity],
            this.vm.entities[this.tooltip.entity]
          )
        : config.name ?? formatName(config.entities[0], this.vm.entities[0]);

    const color = config.show.name_adaptive_color
      ? `opacity: 1; color: ${this.color};`
      : "";

    return html`
      <div class="name flex" part="name">
        <span class="ellipsis" style=${color}>${name}</span>
      </div>
    `;
  }
}

define("mini-graph-card-header", MgcHeader);
