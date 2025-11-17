import {
  compress as lzStringCompress,
  decompress as lzStringDecompress,
} from "@kalkih/lz-string";
import { Connection, HassEntity } from "home-assistant-js-websocket";

export interface HassConnection {
  connection: Connection;
  states?: Record<string, HassEntity>;
}

function getMin<T extends Record<string, any>>(arr: T[], val: string): T {
  return arr.reduce(
    (min, p) => (Number(p[val]) < Number(min[val]) ? p : min),
    arr[0]
  );
}

function getAvg<T extends Record<string, any>>(arr: T[], val: string): number {
  return arr.reduce((sum, p) => sum + Number(p[val]), 0) / arr.length;
}

function getMax<T extends Record<string, any>>(arr: T[], val: string): T {
  return arr.reduce(
    (max, p) => (Number(p[val]) > Number(max[val]) ? p : max),
    arr[0]
  );
}

function getTime(
  date: Date,
  extra: Record<string, any>,
  locale: string = "en-US"
): string {
  return date.toLocaleString(locale, {
    hour: "numeric",
    minute: "numeric",
    ...extra,
  });
}

function getMilli(hours: number): number {
  return hours * 60 ** 2 * 10 ** 3;
}

function compress(data: any): string {
  return lzStringCompress(JSON.stringify(data));
}

function decompress(data: string | any): any {
  return typeof data === "string" ? JSON.parse(lzStringDecompress(data)) : data;
}

function getFirstDefinedItem<T>(
  ...collection: (T | undefined)[]
): T | undefined {
  return collection.find((item) => typeof item !== "undefined");
}

function compareArray<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function log(message: any): void {
  // eslint-disable-next-line no-console
  console.warn("mini-graph-card: ", message);
}
/**
 * Try to get state from Home Assistant frontend store
 */
function getStateFromStore(
  hass: HassConnection,
  entityId: string
): HassEntity | null {
  if (hass && hass.states && hass.states[entityId]) {
    return hass.states[entityId];
  }
  return null;
}

export {
  getMin,
  getAvg,
  getMax,
  getTime,
  getMilli,
  compress,
  decompress,
  log,
  getFirstDefinedItem,
  compareArray,
  getStateFromStore,
};
