import { css, html, LitElement, PropertyValues, svg } from "lit";
import { GraphViewModel } from "~/card/viewModel";
import { computeColor } from "~/presentation/color";
import { formatState } from "~/presentation/format";
import { Bar, Point } from "~/graph";
import { Tooltip } from "~/types";
import { V, X, Y } from "~/const";
import { define, sharedStyles } from "./shared";

/**
 * The graph itself: axis labels, SVG lines/fills/points/bars/gradients
 * and the loading spinner. The whole SVG lives in one shadow root so the
 * mask/gradient URL references and path-length animation keep working.
 *
 * Styling flags are passed as host attributes by the root card:
 * `points`, `labels`, `labels-secondary`, `card-hover`, `fill`, `gradient`.
 *
 * Events: `tooltip-changed` (detail: {entity, index, value} | null).
 */
export class MgcGraph extends LitElement {
  vm!: GraphViewModel;
  tooltip: Tooltip = {};
  language = "en";

  private lengths: (number | string)[] = [];
  private readonly maskId = Math.random().toString(36).substring(2, 11);

  static get properties() {
    return {
      vm: { attribute: false },
      tooltip: { attribute: false },
      language: { type: String },
      lengths: { attribute: false, state: true },
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      :host([points]) .line--points,
      :host([labels]) .graph__labels.--primary {
        opacity: 0;
        transition: opacity 0.25s;
        animation: none;
      }
      :host([labels-secondary]) .graph__labels.--secondary {
        opacity: 0;
        transition: opacity 0.25s;
        animation: none;
      }
      :host([points][card-hover]) .line--points,
      :host([card-hover]) .graph__labels.--primary,
      :host([card-hover]) .graph__labels.--secondary {
        opacity: 1;
      }
      :host([fill]) path {
        stroke-linecap: initial;
        stroke-linejoin: initial;
      }
      ha-spinner {
        margin: 4px auto;
      }
      .graph__container {
        display: flex;
        flex-direction: row;
        position: relative;
      }
      .graph__container__svg {
        cursor: default;
        flex: 1;
      }
      svg {
        overflow: hidden;
        display: block;
      }
      path {
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .fill[anim="false"] {
        animation: reveal 0.25s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .fill[anim="false"][type="fade"] {
        animation: reveal-2 0.25s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .line--points[anim="false"],
      .line[anim="false"] {
        animation: pop 0.25s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .line--points[inactive],
      .line--rect[inactive],
      .fill--rect[inactive] {
        opacity: 0 !important;
        animation: none !important;
        transition: all 0.15s !important;
      }
      .line--points[tooltip] .line--point[inactive] {
        opacity: 0;
      }
      .line--point {
        cursor: pointer;
        fill: var(--primary-background-color, white);
        stroke-width: inherit;
      }
      .line--point:hover {
        fill: var(--mcg-hover, inherit) !important;
      }
      :host([gradient]) .line--point:hover {
        fill: var(--primary-text-color, white);
      }
      .bars {
        animation: pop 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      .bars[anim] {
        animation: bars 0.5s cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      .bar {
        transition: opacity 0.25s cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      .bar:hover {
        opacity: 0.5;
        cursor: pointer;
      }
      path,
      .line--points,
      .fill {
        opacity: 0;
      }
      .line--points[anim="true"][init] {
        animation: pop 0.5s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .fill[anim="true"][init] {
        animation: reveal 0.5s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .fill[anim="true"][init][type="fade"] {
        animation: reveal-2 0.5s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .line[anim="true"][init] {
        animation: dash 1s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
      }
      .graph__labels.--secondary {
        right: 0;
        margin-right: 0px;
        align-items: flex-end;
      }
      .graph__labels {
        align-items: flex-start;
        flex-direction: column;
        font-size: calc(0.15em + 8.5px);
        font-weight: 400;
        justify-content: space-between;
        margin-right: 10px;
        padding: 0.6em;
        position: absolute;
        pointer-events: none;
        top: 0;
        bottom: 0;
        opacity: 0.75;
      }
      .graph__labels > span {
        cursor: pointer;
        background: var(--primary-background-color, white);
        border-radius: 1em;
        padding: 0.2em 0.6em;
        box-shadow:
          0 1px 3px rgba(0, 0, 0, 0.12),
          0 1px 2px rgba(0, 0, 0, 0.24);
      }
      @keyframes reveal {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 0.15;
        }
      }
      @keyframes reveal-2 {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 0.4;
        }
      }
      @keyframes pop {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @keyframes bars {
        0% {
          opacity: 0;
        }
        50% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @keyframes dash {
        0% {
          opacity: 0;
        }
        25% {
          opacity: 1;
        }
        100% {
          opacity: 1;
          stroke-dashoffset: 0;
        }
      }
    `,
  ];

  render() {
    const { config } = this.vm;
    if (!config.show.graph) return html``;

    if (!this.vm.ready) {
      return html`<ha-spinner aria-label="Loading" size="small"></ha-spinner>`;
    }

    return html`
      <div class="graph__container" part="graph">
        ${this.renderLabels()} ${this.renderLabelsSecondary()}
        <div class="graph__container__svg">${this.renderSvg()}</div>
      </div>
    `;
  }

  updated(changedProperties: PropertyValues) {
    const { config } = this.vm;
    if (config.animate && changedProperties.has("vm")) {
      if (this.lengths.length < this.vm.entities.length) {
        this.shadowRoot
          ?.querySelectorAll<SVGPathElement>("svg path.line")
          .forEach((ele) => {
            // the entity index is bound to the path via `.id=${i}`
            this.lengths[Number(ele.id)] = ele.getTotalLength();
          });
        this.lengths = [...this.lengths];
      } else {
        this.lengths = Array(this.vm.entities.length).fill("none");
      }
    }
  }

  // -----------------------------------------------------------------
  // Labels
  // -----------------------------------------------------------------
  private renderLabels() {
    const { config, bound } = this.vm;
    if (!config.show.labels || !this.hasSeries("primary")) return "";
    return html`
      <div class="graph__labels --primary flex" part="labels">
        <span class="label--max">
          ${formatState(config, this.language, bound[1])}
        </span>
        <span class="label--min">
          ${formatState(config, this.language, bound[0])}
        </span>
      </div>
    `;
  }

  private renderLabelsSecondary() {
    const { config, boundSecondary } = this.vm;
    if (!config.show.labels_secondary || !this.hasSeries("secondary"))
      return "";
    return html`
      <div class="graph__labels --secondary flex" part="labels-secondary">
        <span class="label--max">
          ${formatState(config, this.language, boundSecondary[1])}
        </span>
        <span class="label--min">
          ${formatState(config, this.language, boundSecondary[0])}
        </span>
      </div>
    `;
  }

  private hasSeries(axis: "primary" | "secondary"): boolean {
    return this.vm.config.entities.some(
      (entity) =>
        entity.show_graph !== false && (entity.y_axis ?? "primary") === axis
    );
  }

  // -----------------------------------------------------------------
  // SVG
  // -----------------------------------------------------------------
  private renderSvg() {
    const { config, fill, line, bar, points, gradient } = this.vm;
    const { height } = config;
    return svg`
      <svg width='100%' height=${height !== 0 ? "100%" : 0} viewBox='0 0 500 ${height}'
        @click=${(e: Event) => e.stopPropagation()}>
        <g>
          <defs>
            ${this.renderSvgGradients()}
          </defs>
          ${fill.map((entityFill, i) => this.renderSvgFill(entityFill, i))}
          ${fill.map((entityFill, i) => this.renderSvgFillRect(entityFill, i))}
          ${line.map((entityLine, i) => this.renderSvgLine(entityLine, i))}
          ${line.map((entityLine, i) => this.renderSvgLineRect(entityLine, i))}
          ${bar.map((entityBars, i) => this.renderSvgBars(entityBars, i))}
        </g>
        ${points.map((entityPoints, i) => this.renderSvgPoints(entityPoints, i))}
      </svg>`;
  }

  private renderSvgGradients() {
    const { gradient } = this.vm;
    const items = gradient.map((entityGradient, i) => {
      if (!entityGradient) return svg``;
      return svg`
        <linearGradient id=${`grad-${this.maskId}-${i}`} gradientTransform="rotate(90)">
          ${entityGradient.map(
            (stop) => svg`
            <stop stop-color=${stop.color} offset=${`${stop.offset}%`} />
          `
          )}
        </linearGradient>`;
    });
    return svg`${items}`;
  }

  private renderSvgFill(fill: string | undefined, i: number) {
    if (!fill) return;
    const { config } = this.vm;
    const fade = config.show.fill === "fade";
    const init = this.lengths[i] || config.entities[i].show_line === false;
    return svg`
      <defs>
        <linearGradient id=${`fill-grad-${this.maskId}-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop stop-color='white' offset='0%' stop-opacity='1'/>
          <stop stop-color='white' offset='100%' stop-opacity='.15'/>
        </linearGradient>
        <mask id=${`fill-grad-mask-${this.maskId}-${i}`}>
          <rect width="100%" height="100%" fill=${`url(#fill-grad-${this.maskId}-${i})`} />
        </mask>
      </defs>
      <mask id=${`fill-${this.maskId}-${i}`}>
        <path class='fill'
          type=${config.show.fill}
          .id=${i} anim=${config.animate} ?init=${init}
          style="animation-delay: ${config.animate ? `${i * 0.5}s` : "0s"}"
          fill='white'
          mask=${fade ? `url(#fill-grad-mask-${this.maskId}-${i})` : ""}
          d=${fill}
        />
      </mask>`;
  }

  private renderSvgLine(line: string | undefined, i: number) {
    if (!line) return;
    const { config } = this.vm;
    const path = svg`
      <path
        class='line'
        .id=${i}
        anim=${config.animate} ?init=${this.lengths[i]}
        style="animation-delay: ${config.animate ? `${i * 0.5}s` : "0s"}"
        fill='none'
        stroke-dasharray=${this.lengths[i] || "none"}
        stroke-dashoffset=${this.lengths[i] || "none"}
        stroke=${"white"}
        stroke-width=${config.line_width}
        d=${line}
      />`;

    return svg`
      <mask id=${`line-${this.maskId}-${i}`}>
        ${path}
      </mask>
    `;
  }

  private renderSvgLineRect(line: string | undefined, i: number) {
    if (!line) return;
    const fill = this.vm.gradient[i]
      ? `url(#grad-${this.maskId}-${i})`
      : computeColor(this.vm.config, i, this.vm.entities[i]?.state);
    return svg`
      <rect class='line--rect'
        ?inactive=${this.isInactive(i)}
        id=${`rect-${this.maskId}-${i}`}
        fill=${fill} height="100%" width="100%"
        mask=${`url(#line-${this.maskId}-${i})`}
      />`;
  }

  private renderSvgFillRect(fill: string | undefined, i: number) {
    if (!fill) return;
    const svgFill = this.vm.gradient[i]
      ? `url(#grad-${this.maskId}-${i})`
      : computeColor(this.vm.config, i, this.vm.entities[i]?.state);
    return svg`
      <rect class='fill--rect'
        ?inactive=${this.isInactive(i)}
        id=${`fill-rect-${this.maskId}-${i}`}
        fill=${svgFill} height="100%" width="100%"
        mask=${`url(#fill-${this.maskId}-${i})`}
      />`;
  }

  private renderSvgPoints(points: Point[] | undefined, i: number) {
    if (!points) return;
    const { config } = this.vm;
    const color = computeColor(config, i, this.vm.entities[i]?.state);
    return svg`
      <g class='line--points'
        ?tooltip=${this.tooltip.entity === i}
        ?inactive=${this.isInactive(i)}
        ?init=${this.lengths[i]}
        anim=${config.animate && config.show.points !== "hover"}
        style="animation-delay: ${config.animate ? `${i * 0.5 + 0.5}s` : "0s"}"
        fill=${color}
        stroke=${color}
        stroke-width=${config.line_width / 2}>
        ${points.map((point) => this.renderSvgPoint(point, i))}
      </g>`;
  }

  private renderSvgPoint(point: Point, i: number) {
    const color = this.vm.gradient[i]
      ? computeColor(this.vm.config, i, point[V])
      : "inherit";
    return svg`
      <circle
        class='line--point'
        ?inactive=${this.tooltip.index !== point[3]}
        style=${`--mcg-hover: ${color};`}
        stroke=${color}
        fill=${color}
        cx=${point[X]} cy=${point[Y]} r=${this.vm.config.line_width}
        @mouseover=${() => this.setTooltip(i, point[3], point[V])}
        @mouseout=${() => this.clearTooltip()}
      />
    `;
  }

  private renderSvgBars(bars: Bar[] | undefined, index: number) {
    if (!bars) return;
    const { config } = this.vm;
    const items = bars.map((bar, i) => {
      const animation = config.animate
        ? svg`
          <animate attributeName='y' from=${config.height} to=${bar.y} dur='1s' fill='remove'
            calcMode='spline' keyTimes='0; 1' keySplines='0.215 0.61 0.355 1'>
          </animate>`
        : "";
      const color = computeColor(config, index, bar.value);
      return svg`
        <rect class='bar' x=${bar.x} y=${bar.y}
          height=${bar.height} width=${bar.width} fill=${color}
          @mouseover=${() => this.setTooltip(index, i, bar.value)}
          @mouseout=${() => this.clearTooltip()}>
          ${animation}
        </rect>`;
    });
    return svg`<g class='bars' ?anim=${config.animate}>${items}</g>`;
  }

  private isInactive(i: number): boolean {
    return this.tooltip.entity !== undefined && this.tooltip.entity !== i;
  }

  // -----------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------
  private setTooltip(entity: number, index: number, value: string | number) {
    this.dispatchEvent(
      new CustomEvent("tooltip-changed", {
        detail: { entity, index, value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private clearTooltip() {
    this.dispatchEvent(
      new CustomEvent("tooltip-changed", {
        detail: null,
        bubbles: true,
        composed: true,
      })
    );
  }
}

define("mini-graph-card-graph", MgcGraph);
