import { html, LitElement } from "lit";
import { EntityConfig, StoreEntityState } from "~/types";
import { define } from "./shared";

/**
 * "Entity not available" warnings, shown instead of the card body.
 */
export class MgcWarnings extends LitElement {
  entities: EntityConfig[] = [];
  states: (StoreEntityState | undefined)[] = [];

  static get properties() {
    return {
      entities: { attribute: false },
      states: { attribute: false },
    };
  }

  render() {
    return html`
      <hui-warning>
        <div>mini-graph-card</div>
        ${this.entities.map((entity, index) =>
          !this.states[index]
            ? html`<div>Entity not available: ${entity.entity}</div>`
            : html``
        )}
      </hui-warning>
    `;
  }
}

define("mini-graph-card-warnings", MgcWarnings);
