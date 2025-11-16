import { createContext } from "@lit/context";
import { EntityStore } from "./entityStore";

export const entityStoreContext = createContext<EntityStore>("entity-store");
