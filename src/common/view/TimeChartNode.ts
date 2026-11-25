/** Shared time-domain rendering for the triggered scope and rolling strip chart. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Path, Rectangle, type TColor } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { CHART_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import { formatTickValue, hystereticSpan, niceTicks } from "./axisScale.js";
import { ChartFrame } from "./ChartFrame.js";

type TimeFrameOptions = ConstructorParameters<typeof ChartFrame>[0];

/** Drawing primitives for scope and strip views. */
export class TimeChartNode extends ChartFrame {
  protected span: number = settings.MINIMUM_VOLTAGE_SPAN;
  private lastSpan = 0;
  private lastDuration = 0;
  private lastFixedY: Range | undefined;
  private redrawElapsed = Infinity;

  private readonly timeOptions: TimeFrameOptions;
  private readonly samplesPerSecond: number;

  public constructor(timeOptions: TimeFrameOptions, samplesPerSecond: number) {
    super(timeOptions);
    this.timeOptions = timeOptions;
    this.samplesPerSecond = samplesPerSecond;
  }

  /** Use elapsed wall time to enforce a maximum drawing rate. */
  protected readyToDraw(dt: number): boolean {
    if (!this.visible) {
      return false;
    }
    this.redrawElapsed += dt;
    if (this.redrawElapsed < 1 / settings.SCOPE_REDRAW_HZ) {
      return false;
    }
    this.redrawElapsed = 0;
    return true;
  }

  protected newTrace(color: TColor, visibleProperty?: TReadOnlyProperty<boolean>): Path {
    const path = new Path(null, {
      stroke: color,
      lineWidth: settings.TRACE_WIDTH,
      ...(visibleProperty ? { visibleProperty } : {}),
    });
    this.plot.addChild(path);
    this.bag.own(path);
    return path;
  }

  protected newGuide(dashed = true): Path {
    const path = new Path(null, {
      stroke: Colors.guideColorProperty,
      lineWidth: dashed ? settings.GUIDE_WIDTH : settings.GRID_WIDTH,
      lineDash: dashed ? [...settings.DASH] : [],
    });
    this.plot.addChild(path);
    this.bag.own(path);
    return path;
  }

  protected newBand(): Rectangle {
    const band = new Rectangle(0, 0, 0, 0, { fill: Colors.rangeBandColorProperty });
    this.plot.addChild(band);
    this.bag.own(band);
    return band;
  }

  protected updateAxes(peak: number, duration: number, rolling: boolean, fixedY?: Range): void {
    this.span = hystereticSpan(this.span, peak);
    if (
      this.span === this.lastSpan &&
      duration === this.lastDuration &&
      fixedY?.min === this.lastFixedY?.min &&
      fixedY?.max === this.lastFixedY?.max
    ) {
      return;
    }
    this.lastFixedY = fixedY;
    this.lastSpan = this.span;
    this.lastDuration = duration;
    const start = rolling ? -duration : 0;
    const end = start + duration;
    const tickIntervals = settings.TIME_TICK_INTERVALS;
    const msPerSecond = 1000;
    const xTicks = Array.from({ length: tickIntervals + 1 }, (_, index) => {
      const value = start + (index * duration) / tickIntervals;
      return { value, label: formatTickValue(value * (rolling ? 1 : msPerSecond), 1) };
    });
    const limit = this.span * settings.SCALE_HEADROOM;
    const tickValues = this.timeOptions.compact
      ? [-this.span, 0, this.span]
      : [-this.span, -this.span / 2, 0, this.span / 2, this.span];
    const yTicks = fixedY
      ? niceTicks(fixedY, tickIntervals - 1)
      : tickValues.map((value) => ({ value, label: formatTickValue(value, this.span / 4) }));
    this.setAxes(
      new Range(start, end),
      fixedY ?? new Range(-limit, limit),
      xTicks,
      yTicks,
      this.timeOptions.showXAxis !== false,
    );
  }

  /** Draw one path from the caller's preallocated chronological sample array. */
  protected drawSamples(path: Path, points: Float64Array, count: number, start: number): void {
    const shape = new Shape();
    for (let index = 0; index < count; index++) {
      const x = this.chartTransform.modelToViewX(start + index / this.samplesPerSecond);
      const y = this.chartTransform.modelToViewY(points[index] as number);
      if (index === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    path.shape = shape;
  }

  protected drawGuide(path: Path, value: number): void {
    const y = this.chartTransform.modelToViewY(value);
    path.shape = new Shape().moveTo(0, y).lineTo(this.plotWidth, y);
  }
}
