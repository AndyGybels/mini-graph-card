import {
  compress as lzStringCompress,
  decompress as lzStringDecompress,
} from "@kalkih/lz-string";

function getMin<T extends Record<string, unknown>>(arr: T[], val: string): T {
  return arr.reduce(
    (min, p) => (Number(p[val]) < Number(min[val]) ? p : min),
    arr[0]
  );
}

function getAvg<T extends Record<string, unknown>>(
  arr: T[],
  val: string
): number {
  return arr.reduce((sum, p) => sum + Number(p[val]), 0) / arr.length;
}

function getMax<T extends Record<string, unknown>>(arr: T[], val: string): T {
  return arr.reduce(
    (max, p) => (Number(p[val]) > Number(max[val]) ? p : max),
    arr[0]
  );
}

function getTime(
  date: Date,
  extra: Intl.DateTimeFormatOptions,
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

function compress(data: unknown): string {
  return lzStringCompress(JSON.stringify(data));
}

function decompress(data: unknown): unknown {
  return typeof data === "string" ? JSON.parse(lzStringDecompress(data)) : data;
}

function getFirstDefinedItem<T>(
  ...collection: (T | undefined | null)[]
): T | undefined {
  return (
    collection.find((item) => item !== undefined && item !== null) ?? undefined
  );
}

function compareArray<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Leading+trailing throttle: the first call runs immediately, calls inside
 * the window coalesce into one trailing run at the window's edge.
 */
function createThrottle(fn: () => void, ms: number): () => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    const remaining = ms - (Date.now() - last);
    if (remaining <= 0) {
      last = Date.now();
      fn();
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = undefined;
        last = Date.now();
        fn();
      }, remaining);
    }
  };
}

function log(message: unknown): void {
  // eslint-disable-next-line no-console
  console.warn("mini-graph-card: ", message);
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
  createThrottle,
};
