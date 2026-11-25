/** A rolling strip chart with optional extra channels, statistical guides, and a time marker. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Path, type Rectangle, type TColor } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { CHART_SETTINGS, SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { RingBuffer } from "../model/RingBuffer.js";
import type { RunningStats } from "../model/RunningStats.js";
import { chartLabelFont, instrumentText } from "./instrumentText.js";
import { TimeChartNode } from "./TimeChartNode.js";

type Channel = { history: RingBuffer; color: TColor; visibleProperty?: TReadOnlyProperty<boolean> };

type StripOptions = ConstructorParameters<typeof TimeChartNode>[0] & {
  windowProperty: TReadOnlyProperty<number>;
  color: TColor;
  statistics?: () => RunningStats | null;
  predicted?: TReadOnlyProperty<number>;
  predictedSigma?: TReadOnlyProperty<number>;
  yRange?: () => Range;
  eventAge?: () => number | null;
  additionalChannels?: readonly Channel[];
  minimumSpan?: () => number;
  readingProperty?: TReadOnlyProperty<string>;
};

export class StripChartNode extends TimeChartNode {
  private readonly scratch = new Float64Array(CHART_SETTINGS.STRIP_WINDOWS[2] * SAMPLING_SETTINGS.STRIP_RATE + 1);
  private readonly band: Rectangle | null;
  private readonly channels;
  private readonly guide;
  private readonly sigmaGuides;
  private readonly timeMarker;

  private readonly options: StripOptions;

  public constructor(history: RingBuffer, options: StripOptions) {
    super(options, SAMPLING_SETTINGS.STRIP_RATE);
    this.options = options;
    this.band = options.statistics ? this.newBand() : null;
    this.channels = [{ history, color: options.color }, ...(options.additionalChannels ?? [])].map(
      ({ history: buffer, color, visibleProperty }: Channel) => ({
        buffer,
        trace: this.newTrace(color, visibleProperty),
        visibleProperty,
      }),
    );
    this.guide = options.predicted ? this.newGuide() : null;
    this.sigmaGuides = options.predictedSigma ? [this.newGuide(false), this.newGuide(false)] : [];
    this.timeMarker = options.eventAge
      ? new Path(null, { stroke: Colors.guideColorProperty, lineDash: [...CHART_SETTINGS.DASH] })
      : null;
    if (this.timeMarker) {
      this.plot.addChild(this.timeMarker);
      this.bag.own(this.timeMarker);
    }
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
    const stats = this.options.statistics?.();
    const high = stats ? stats.mean + stats.standardDeviation : 0;
    const low = stats ? stats.mean - stats.standardDeviation : 0;
    const predicted = this.options.predicted?.value ?? 0;
    const sigma = this.options.predictedSigma?.value ?? 0;
    const range = this.options.yRange?.();
    let peak = Math.max(Math.abs(high), Math.abs(low), Math.abs(predicted) + sigma, this.options.minimumSpan?.() ?? 0);
    const requestedCount = Math.floor(duration * STRIP_RATE) + 1;
    if (!range) {
      for (const { buffer, visibleProperty } of this.channels) {
        if (visibleProperty?.value === false) {
          continue;
        }
        const count = Math.min(requestedCount, buffer.length);
        for (let index = 0; index < count; index++) {
          peak = Math.max(peak, Math.abs(buffer.atAge(index)));
        }
      }
    }
    this.updateAxes(peak, duration, true, range);
    for (const { buffer, trace, visibleProperty } of this.channels) {
      if (visibleProperty?.value === false) {
        continue;
      }
      const count = buffer.copyLatest(requestedCount, this.scratch);
      this.drawSamples(trace, this.scratch, count, -(count - 1) / STRIP_RATE);
    }
    this.band?.setRect(
      0,
      this.chartTransform.modelToViewY(high),
      this.plotWidth,
      this.chartTransform.modelToViewY(low) - this.chartTransform.modelToViewY(high),
    );
    if (this.guide) {
      this.drawGuide(this.guide, predicted);
    }
    this.sigmaGuides.forEach((line, index) => {
      this.drawGuide(line, predicted + (index === 0 ? -sigma : sigma));
    });
    if (this.timeMarker) {
      const age = this.options.eventAge?.();
      const x = this.chartTransform.modelToViewX(-(age ?? 0));
      this.timeMarker.shape =
        typeof age === "number" && age <= duration ? new Shape().moveTo(x, 0).lineTo(x, this.plotHeight) : null;
    }
  }
}
