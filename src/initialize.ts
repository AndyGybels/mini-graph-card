export const INIT = "INIT";
// /* eslint-disable no-console */

// import localForage from "localforage";
// import { decompress } from "./utils";
// import { version } from "../package.json";

// interface EntityHistoryCache {
//   hours_to_show: number;
//   last_fetched: string;
//   version: string;
//   [key: string]: any;
// }
// localForage.config({
//   name: "mini-graph-card",
//   version: 1.0,
//   storeName: "entity_history_cache",
//   description: "Mini graph card uses caching for the entity history",
// });

// localForage
//   .iterate((data: EntityHistoryCache, key: string) => {
//     const value: EntityHistoryCache = key.endsWith("-raw")
//       ? data
//       : decompress(data);
//     const start = new Date();
//     start.setHours(start.getHours() - value.hours_to_show);
//     if (data.version !== version || new Date(value.last_fetched) < start) {
//       void localForage.removeItem(key);
//     }
//   })
//   .catch((err: unknown) => {
//     console.warn("Purging has errored: ", err);
//   });

// console.info(
//   `%c MINI-GRAPH-CARD %c ${version} `,
//   "color: white; background: coral; font-weight: 700;",
//   "color: coral; background: white; font-weight: 700;"
// );
