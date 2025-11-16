import { LitElement } from "lit";
import { EntityStore } from "./entityStore";
import { provide } from "@lit/context";
import { entityStoreContext } from "./entityStoreContext";
import { MiniGraphCardHomeAssistant } from "~/types";

export class EntityStoreProvider extends LitElement {
  @provide({ context: entityStoreContext })
  entityStore!: EntityStore;

  set hass(hass: MiniGraphCardHomeAssistant) {
    if (!hass.__entityStore__) {
      hass.__entityStore__ = new EntityStore(hass);
    }
    this.entityStore = hass.__entityStore__;
  }
}
