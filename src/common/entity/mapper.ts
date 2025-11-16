import { isEntityObject } from "~/guards";
import { EntityConfig } from "~/types";

export function mapToEntityIds(entities: EntityConfig[]): string[] {
  return entities.map((e) => (isEntityObject(e) ? e.entity : e));
}
