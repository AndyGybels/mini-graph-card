import { interpolateRGB } from "./presentation/color";
import { X, Y, V, ONE_HOUR } from "./const";
import { EntityHistoryState } from "./types";
import { AggregateFuncName, GroupBy } from "./types";

type HistoryItem = EntityHistoryState;

type Coord = [number, number, number];
export type Point = [number, number, number, number];

export type GradientStop = {
  value: number;
  color: string;
};

export type GradientResult = {
  color: string;
  offset: number;
};

export type Bar = {
  x: number;
  y: number;
  height: number;
  width: number;
  value: number;
};


export default class Graph {
  private _history: HistoryItem[] | undefined;
  coords: Coord[];
  width: number;
  height: number;
  margin: number[];
  private _max: number;
  private _min: number;
  points: number;
  hours: number;
  aggregateFuncName: AggregateFuncName;
  private _calcPoint: (items: HistoryItem[]) => number;
  private _smoothing: boolean;
  private _logarithmic: boolean;
  private _groupBy: GroupBy;
  private _endTime: number;

  constructor(
    width: number,
    height: number,
    margin: number[],
    hours = 24,
    points = 1,
    aggregateFuncName: AggregateFuncName = "avg",
    groupBy: GroupBy = "interval",
    smoothing = true,
    logarithmic = false
  ) {
    const aggregateFuncMap = {
      avg: this._average.bind(this),
      median: this._median.bind(this),
      max: this._maximum.bind(this),
      min: this._minimum.bind(this),
      first: this._first.bind(this),
      last: this._last.bind(this),
      sum: this._sum.bind(this),
      delta: this._delta.bind(this),
      diff: this._diff.bind(this),
    };

    this._history = undefined;
    this.coords = [];
    this.width = width - margin[X] * 2;
    this.height = height - margin[Y] * 4;
    this.margin = margin;
    this._max = 0;
    this._min = 0;
    this.points = points;
    this.hours = hours;
    this.aggregateFuncName = aggregateFuncName;
    this._calcPoint =
      aggregateFuncMap[aggregateFuncName] || this._average.bind(this);
    this._smoothing = smoothing;
    this._logarithmic = logarithmic;
    this._groupBy = groupBy;
    this._endTime = 0;
  }

  get max() {
    return this._max;
  }

  set max(max: number) {
    this._max = max;
  }

  get min() {
    return this._min;
  }

  set min(min: number) {
    this._min = min;
  }

  set history(data: HistoryItem[] | undefined) {
    this._history = data;
  }

  update(history?: HistoryItem[]) {
    if (history) {
      this._history = history;
    }
    if (!this._history) return;
    this._updateEndTime();

    const histGroups = this._history.reduce(
      (res, item) => this._reducer(res, item),
      [] as HistoryItem[][]
    );

    // extend length to fill missing history
    const requiredNumOfPoints = Math.ceil(this.hours * this.points);
    histGroups.length = requiredNumOfPoints;

    this.coords = this._calcPoints(histGroups);
    this.min = Math.min(...this.coords.map((item) => Number(item[V])));
    this.max = Math.max(...this.coords.map((item) => Number(item[V])));
  }

  private _reducer(res: HistoryItem[][], item: HistoryItem): HistoryItem[][] {
    // lu/lc are epoch seconds (HA websocket minimal format); _endTime is ms
    const age = this._endTime - (item.lc ?? item.lu) * 1000;
    const interval = (age / ONE_HOUR) * this.points - this.hours * this.points;
    if (interval < 0) {
      const key = Math.floor(Math.abs(interval));
      if (!res[key]) res[key] = [];
      res[key].push(item);
    } else {
      res[0] = [item];
    }
    return res;
  }

  private _calcPoints(history: HistoryItem[][]): Coord[] {
    let xRatio = this.width / (this.hours * this.points - 1);
    xRatio = Number.isFinite(xRatio) ? xRatio : this.width;

    const coords: Coord[] = [];
    let last = history.filter(Boolean)[0];
    let x: number;
    for (let i = 0; i < history.length; i += 1) {
      x = xRatio * i + this.margin[X];
      if (history[i]) {
        last = history[i];
        coords.push([x, 0, this._calcPoint(last)]);
      } else {
        coords.push([x, 0, this._lastValue(last)]);
      }
    }
    return coords;
  }

  private _calcY(coords: Coord[]): Coord[] {
    // account for logarithmic graph
    const max = this._logarithmic
      ? Math.log10(Math.max(1, this.max))
      : this.max;
    const min = this._logarithmic
      ? Math.log10(Math.max(1, this.min))
      : this.min;

    const yRatio = (max - min) / this.height || 1;
    const coords2 = coords.map((coord): Coord => {
      const val = this._logarithmic
        ? Math.log10(Math.max(1, coord[V]))
        : coord[V];
      const coordY = this.height - (val - min) / yRatio + this.margin[Y] * 2;
      return [coord[X], coordY, coord[V]];
    });

    return coords2;
  }

  getPoints(): Point[] {
    let { coords } = this;
    if (coords.length === 1) {
      coords[1] = [this.width + this.margin[X], 0, coords[0][V]];
    }
    coords = this._calcY(this.coords);
    if (this._smoothing) {
      let last = coords[0];
      coords.shift();
      return coords.map((point, i): Point => {
        const Z = this._midPoint(last[X], last[Y], point[X], point[Y]);
        const sum = (last[V] + point[V]) / 2;
        last = point;
        return [Z[X], Z[Y], sum, i + 1];
      });
    } else {
      return coords.map((point, i): Point => [point[X], point[Y], point[V], i]);
    }
  }

  getPath(): string {
    let { coords } = this;
    if (coords.length === 1) {
      coords[1] = [this.width + this.margin[X], 0, coords[0][V]];
    }
    coords = this._calcY(this.coords);
    let next: Coord;
    let Z: number[] | Coord;
    let path = "";
    let last = coords[0];
    path += `M${last[X]},${last[Y]}`;

    coords.forEach((point) => {
      next = point;
      Z = this._smoothing
        ? this._midPoint(last[X], last[Y], next[X], next[Y])
        : next;
      path += ` ${Z[X]},${Z[Y]}`;
      path += ` Q ${next[X]},${next[Y]}`;
      last = next;
    });
    path += ` ${next![X]},${next![Y]}`;
    return path;
  }

  computeGradient(
    thresholds: GradientStop[],
    logarithmic: boolean
  ): GradientResult[] {
    const scale = logarithmic
      ? Math.log10(Math.max(1, this._max)) - Math.log10(Math.max(1, this._min))
      : this._max - this._min;

    return thresholds.map((stop, index, arr): GradientResult => {
      let color: string | undefined;
      if (stop.value > this._max && arr[index + 1]) {
        const factor =
          (this._max - arr[index + 1].value) /
          (stop.value - arr[index + 1].value);
        color = interpolateRGB(arr[index + 1].color, stop.color, factor);
      } else if (stop.value < this._min && arr[index - 1]) {
        const factor =
          (arr[index - 1].value - this._min) /
          (arr[index - 1].value - stop.value);
        color = interpolateRGB(arr[index - 1].color, stop.color, factor);
      }
      let offset: number;
      if (scale <= 0) {
        offset = 0;
      } else if (logarithmic) {
        offset =
          (Math.log10(Math.max(1, this._max)) -
            Math.log10(Math.max(1, stop.value))) *
          (100 / scale);
      } else {
        offset = (this._max - stop.value) * (100 / scale);
      }
      return {
        color: color || stop.color,
        offset,
      };
    });
  }

  getFill(path: string): string {
    const height = this.height + this.margin[Y] * 4;
    let fill = path;
    // note that currently this.margin[X] = 0 when fill is defined
    fill += ` L ${this.width + this.margin[X]}, ${height}`;
    fill += ` L ${this.coords[0][X]}, ${height} z`;
    return fill;
  }

  getBars(position: number, total: number, spacing = 4): Bar[] {
    const coords = this._calcY(this.coords);
    const xRatio =
      (this.width - spacing) / Math.ceil(this.hours * this.points) / total;
    return coords.map(
      (coord, i): Bar => ({
        x: xRatio * i * total + xRatio * position + spacing,
        y: coord[Y],
        height: this.height - coord[Y] + this.margin[Y] * 4,
        width: xRatio - spacing,
        value: coord[V],
      })
    );
  }

  private _midPoint(
    Ax: number,
    Ay: number,
    Bx: number,
    By: number
  ): [number, number] {
    const Zx = (Ax - Bx) / 2 + Bx;
    const Zy = (Ay - By) / 2 + By;
    return [Zx, Zy];
  }

  private _average(items: HistoryItem[]): number {
    return (
      items.reduce((sum, entry) => sum + parseFloat(entry.s), 0) / items.length
    );
  }

  private _median(items: HistoryItem[]): number {
    const itemsDup = [...items].sort(
      (a, b) => parseFloat(a.s) - parseFloat(b.s)
    );
    const mid = Math.floor((itemsDup.length - 1) / 2);
    if (itemsDup.length % 2 === 1) return parseFloat(itemsDup[mid].s);
    return (parseFloat(itemsDup[mid].s) + parseFloat(itemsDup[mid + 1].s)) / 2;
  }

  private _maximum(items: HistoryItem[]): number {
    return Math.max(...items.map((item) => parseFloat(item.s)));
  }

  private _minimum(items: HistoryItem[]): number {
    return Math.min(...items.map((item) => parseFloat(item.s)));
  }

  private _first(items: HistoryItem[]): number {
    return parseFloat(items[0].s);
  }

  private _last(items: HistoryItem[]): number {
    return parseFloat(items[items.length - 1].s);
  }

  private _sum(items: HistoryItem[]): number {
    return items.reduce((sum, entry) => sum + parseFloat(entry.s), 0);
  }

  private _delta(items: HistoryItem[]): number {
    return this._maximum(items) - this._minimum(items);
  }

  private _diff(items: HistoryItem[]): number {
    return this._last(items) - this._first(items);
  }

  private _lastValue(items: HistoryItem[]): number {
    if (["delta", "diff"].includes(this.aggregateFuncName)) {
      return 0;
    } else {
      return parseFloat(items[items.length - 1].s) || 0;
    }
  }

  private _updateEndTime(): void {
    this._endTime = new Date().getTime();
    const date = new Date(this._endTime);
    switch (this._groupBy) {
      case "month":
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
        this._endTime = date.getTime();
        break;
      case "date":
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        this._endTime = date.getTime();
        break;
      case "hour":
        date.setHours(date.getHours() + 1);
        date.setMinutes(0, 0, 0);
        this._endTime = date.getTime();
        break;
      default:
        break;
    }
  }
}
