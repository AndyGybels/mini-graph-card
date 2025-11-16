// /* eslint-disable no-bitwise */

export const TEST = "TEST";

// import {
//   compress as lzStringCompress,
//   decompress as lzStringDecompress,
// } from "@kalkih/lz-string";
// import {
//   Connection,
//   HassEntity,
//   HassEntityBase,
// } from "home-assistant-js-websocket";

// export interface HassConnection {
//   connection: Connection;
//   states?: Record<string, HassEntity>;
// }

// function getMin<T extends Record<string, any>>(arr: T[], val: string): T {
//   return arr.reduce(
//     (min, p) => (Number(p[val]) < Number(min[val]) ? p : min),
//     arr[0]
//   );
// }

// function getAvg<T extends Record<string, any>>(arr: T[], val: string): number {
//   return arr.reduce((sum, p) => sum + Number(p[val]), 0) / arr.length;
// }

// function getMax<T extends Record<string, any>>(arr: T[], val: string): T {
//   return arr.reduce(
//     (max, p) => (Number(p[val]) > Number(max[val]) ? p : max),
//     arr[0]
//   );
// }

// function getTime(
//   date: Date,
//   extra: Record<string, any>,
//   locale: string = "en-US"
// ): string {
//   return date.toLocaleString(locale, {
//     hour: "numeric",
//     minute: "numeric",
//     ...extra,
//   });
// }

// function getMilli(hours: number): number {
//   return hours * 60 ** 2 * 10 ** 3;
// }

// function compress(data: any): string {
//   return lzStringCompress(JSON.stringify(data));
// }

// function decompress(data: string | any): any {
//   return typeof data === "string" ? JSON.parse(lzStringDecompress(data)) : data;
// }

// function getFirstDefinedItem<T>(
//   ...collection: (T | undefined)[]
// ): T | undefined {
//   return collection.find((item) => typeof item !== "undefined");
// }

// function compareArray<T>(a: T[], b: T[]): boolean {
//   return a.length === b.length && a.every((value, index) => value === b[index]);
// }

// function log(message: any): void {
//   // eslint-disable-next-line no-console
//   console.warn("mini-graph-card: ", message);
// }

// /**
//  * Subscribe to state changes for all entities and filter for specific ones
//  */
// async function subscribeEvents(
//   hass: HassConnection,
//   entityIds: string[],
//   callback: (entityId: string, newState: HassEntity) => void
// ): Promise<(() => void) | null> {
//   if (!hass.connection) {
//     log("No WebSocket connection available");
//     return null;
//   }
//   try {
//     const entityIdSet = new Set(entityIds);
//     return await hass.connection.subscribeEvents((event: any) => {
//       if (event.data && event.data.new_state) {
//         const entityId = event.data.entity_id;
//         if (entityIdSet.has(entityId)) {
//           callback(entityId, event.data.new_state);
//         }
//       }
//     }, "state_changed");
//   } catch (err) {
//     log(`Failed to subscribe to state_changed events: ${err}`);
//     return null;
//   }
// }

// /**
//  * Fetch history from WebSocket connection
//  */
// async function fetchHistoryWebSocket(
//   hass: HassConnection,
//   entityId: string,
//   start: Date,
//   end: Date,
//   withAttributes: boolean
// ): Promise<any[] | null> {
//   if (!hass.connection) {
//     log("No WebSocket connection available");
//     return null;
//   }
//   try {
//     const params: any = {
//       type: "history/history_during_period",
//       start_time: start.toISOString(),
//       entity_ids: [entityId],
//       minimal_response: !withAttributes,
//       no_attributes: !withAttributes,
//       significant_changes_only: withAttributes ? false : undefined,
//     };

//     if (end) {
//       params.end_time = end.toISOString();
//     }

//     const result = await hass.connection.sendMessagePromise<HistoryState>(
//       params
//     );

//     const entityData = result[entityId];
//     if (entityData && Array.isArray(entityData)) {
//       const transformed = entityData.map((item: any) => ({
//         state: item.s,
//         last_changed: new Date(item.lu * 1000).toISOString(),
//         last_updated: new Date(item.lu * 1000).toISOString(),
//         attributes: item.a || {},
//       }));
//       return [transformed];
//     }
//     return [[]];
//   } catch (err) {
//     log(`Failed to fetch history via WebSocket for ${entityId}: ${err}`);
//     return null;
//   }
// }

// /**
//  * Try to get state from Home Assistant frontend store
//  */
// function getStateFromStore(
//   hass: HassConnection,
//   entityId: string
// ): HassEntity | null {
//   if (hass && hass.states && hass.states[entityId]) {
//     return hass.states[entityId];
//   }
//   return null;
// }

// export {
//   getMin,
//   getAvg,
//   getMax,
//   getTime,
//   getMilli,
//   compress,
//   decompress,
//   log,
//   getFirstDefinedItem,
//   compareArray,
//   subscribeEvents,
//   fetchHistoryWebSocket,
//   getStateFromStore,
// };
