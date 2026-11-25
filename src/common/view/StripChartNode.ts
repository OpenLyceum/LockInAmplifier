/** A rolling strip chart of block-averaged samples, optionally with statistical guides. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Rectangle, TColor } from "scenerystack/scenery";
import { CHART_SETTINGS, SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { RingBuffer } from "../model/RingBuffer.js";
import type { RunningStats } from "../model/RunningStats.js";
import { chartLabelFont, instrumentText } from "./instrumentText.js";
import { TimeChartNode } from "./TimeChartNode.js";

type StripOptions = ConstructorParameters<typeof TimeChartNode>[0] & {
  windowProperty: TReadOnlyProperty<number>;
  color: TColor;
  statistics?: RunningStats;
  predicted?: TReadOnlyProperty<number>;
  minimumSpan?: () => number;
  readingProperty?: TReadOnlyProperty<string>;
};

export class StripChartNode extends TimeChartNode {
  private readonly scratch = new Float64Array(CHART_SETTINGS.STRIP_WINDOWS[2] * SAMPLING_SETTINGS.STRIP_RATE + 1);
  private readonly band: Rectangle | null;
  private readonly trace;
  private readonly guide;

  private readonly history: RingBuffer;
  private readonly options: StripOptions;

  public constructor(history: RingBuffer, options: StripOptions) {
    super(options, SAMPLING_SETTINGS.STRIP_RATE);
    this.history = history;
    this.options = options;
    this.band = options.statistics ? this.newBand() : null;
    this.trace = this.newTrace(options.color);
    this.guide = options.predicted ? this.newGuide() : null;
    if (options.readingProperty) {
      const reading = instrumentText(options.readingProperty, {
        font: chartLabelFont,
        fill: options.color,
        maxWidth: this.plotWidth / 3,
      });
      this.header.addChild(reading);
      this.bag.own(reading);
      this.bag.link(options.readingProperty, () => {
        reading.right = options.width - CHART_SETTINGS.RIGHT;
        reading.centerY = CHART_SETTINGS.TOP / 2;
      });
    }
  }

  /** Place the newest sample at zero and leave unrecorded history blank. */
  public step(dt: number): void {
    if (!this.readyToDraw(dt)) {
      return;
    }
    const { STRIP_RATE } = SAMPLING_SETTINGS;
    const duration = this.options.windowProperty.value;
    const count = this.history.copyLatest(duration * STRIP_RATE + 1, this.scratch);
    const stats = this.options.statistics;
    const high = stats ? stats.mean + stats.standardDeviation : 0;
    const low = stats ? stats.mean - stats.standardDeviation : 0;
    const predicted = this.options.predicted?.value ?? 0;
    let peak = Math.max(Math.abs(high), Math.abs(low), Math.abs(predicted), this.options.minimumSpan?.() ?? 0);
    for (let index = 0; index < count; index++) {
      peak = Math.max(peak, Math.abs(this.scratch[index] as number));
    }
    this.updateAxes(peak, duration, true);
    this.drawSamples(this.trace, this.scratch, count, -(count - 1) / STRIP_RATE);
    this.band?.setRect(
      0,
      this.chartTransform.modelToViewY(high),
      this.plotWidth,
      this.chartTransform.modelToViewY(low) - this.chartTransform.modelToViewY(high),
    );
    if (this.guide) {
      this.drawGuide(this.guide, predicted);
    }
  }
}
