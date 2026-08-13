import { css, html, TemplateResult } from "lit";
import { computeIcon } from "~/presentation/format";
import { GraphViewModel } from "~/card/viewModel";

/** Guarded registration: the registry is shared with every card on the dashboard */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) {
    customElements.define(name, ctor);
  }
}

/** Utility classes shared by every component's shadow root */
export const sharedStyles = css`
  .flex {
    display: flex;
    min-width: 0;
  }
  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/** Icon styling, used by both the header and the states row */
export const iconStyles = css`
  .icon {
    color: var(--mgc-icon-color, var(--state-icon-color, #44739e));
    display: inline-block;
    flex: 0 0 1.7em;
    text-align: center;
  }
  .icon > ha-icon {
    height: 1.7em;
    width: 1.7em;
  }
  .icon[loc="left"] {
    order: -1;
    margin-right: 0.6em;
    margin-left: 0;
  }
  .icon[loc="state"] {
    align-self: center;
  }
`;

/** The entity icon (or configured image), shared by header and states */
export function iconTemplate(
  vm: GraphViewModel,
  color: string | undefined
): TemplateResult | "" {
  const { config } = vm;

  if (config.icon_image !== undefined) {
    return html`
      <div class="icon" part="icon">
        <img src="${config.icon_image}" height="25" />
      </div>
    `;
  }

  const { icon, icon_adaptive_color } = config.show;
  return icon
    ? html`
        <div
          class="icon"
          part="icon"
          loc=${config.align_icon}
          style=${icon_adaptive_color ? `color: ${color};` : ""}
        >
          <ha-icon .icon=${computeIcon(config, vm.entities[0])}></ha-icon>
        </div>
      `
    : "";
}
