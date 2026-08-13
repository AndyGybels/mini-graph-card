import { version } from "../package.json";
import { purgeStaleCache } from "./data/historyCache";

console.info(
  `%c MINI-GRAPH-CARD %c ${version} `,
  "color: white; background: coral; font-weight: 700;",
  "color: coral; background: white; font-weight: 700;"
);

// clean out cached history from older versions or expired windows
purgeStaleCache();
