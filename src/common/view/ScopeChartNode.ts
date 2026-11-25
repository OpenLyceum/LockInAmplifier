/** A triggered fixed-window bamboo chart with one reusable sample array per trace. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { roundSymmetric } from "scenerystack/dot";
import type { TColor } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { CHART_SETTINGS, SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { RingBuffer } from "../model/RingBuffer.js";
import { chartLabelFont, formatValue, instrumentStrings, instrumentText } from "./instrumentText.js";
import { TimeChartNode } from "./TimeChartNode.js";

type Trace<Key> = {
  key: Key;
  color: TColor;
  label: TReadOnlyProperty<string>;
  visibleProperty?: TReadOnlyProperty<boolean>;
};

type ScopeOptions<Key> = ConstructorParameters<typeof TimeChartNode>[0] & {
  windowProperty: TReadOnlyProperty<number>;
  traces: readonly Trace<Key>[];
  mean?: () => number;
  showLegend?: boolean;
  clippingRangeProperty?: TReadOnlyProperty<number>;
};

export class ScopeChartNode<Key extends string> extends TimeChartNode {
  private readonly traces;
  private readonly guide;
  private readonly clippingGuides;
  private readonly meanLabel;
  private readonly visibleLabels;

  private readonly trigger: RingBuffer;
  private readonly options: ScopeOptions<Key>;

  public constructor(buffers: Record<Key, RingBuffer>, trigger: RingBuffer, options: ScopeOptions<Key>) {
    super(options, SAMPLING_SETTINGS.SAMPLE_RATE);
    this.trigger = trigger;
    this.options = options;
    this.traces = options.traces.map((trace) => ({
      buffer: buffers[trace.key],
      scratch: new Float64Array(Math.ceil(CHART_SETTINGS.SCOPE_WINDOWS[3] * SAMPLING_SETTINGS.SAMPLE_RATE) + 1),
      path: this.newTrace(trace.color, trace.visibleProperty),
      count: 0,
    }));
    this.guide = options.mean ? this.newGuide() : null;
    this.clippingGuides = options.clippingRangeProperty ? ([this.newGuide(), this.newGuide()] as const) : null;
    this.meanLabel = options.mean
      ? instrumentText(instrumentStrings.units.unavailableStringProperty.value, {
          font: chartLabelFont,
          fill: Colors.guideColorProperty,
          centerY: CHART_SETTINGS.COMPACT_TOP / 2,
          maxWidth: this.plotWidth / 3,
        })
      : null;
    if (this.meanLabel) {
      this.header.addChild(this.meanLabel);
      this.bag.own(this.meanLabel);
    }
    this.visibleLabels = options.showLegend
      ? options.traces.map((trace) =>
          instrumentText(trace.label, {
            font: chartLabelFont,
            fill: trace.color,
            centerY: CHART_SETTINGS.TOP / 2,
            ...(trace.visibleProperty ? { visibleProperty: trace.visibleProperty } : {}),
          }),
        )
      : [];
    for (const label of this.visibleLabels) {
      this.header.addChild(label);
      this.bag.own(label);
    }
  }

  /** Sample histories and replace plot shapes on the next permitted redraw. */
  public step(dt: number): void {
    if (!this.readyToDraw(dt)) {
      return;
    }
    const duration = this.options.windowProperty.value;
    const count = roundSymmetric(duration * SAMPLING_SETTINGS.SAMPLE_RATE) + 1;
    const mean = this.options.mean?.() ?? 0;
    let peak = Math.abs(mean);
    for (const trace of this.traces) {
      if (!trace.path.visible) {
        continue;
      }
      trace.count = trace.buffer.copyTriggered(count, trace.scratch, this.trigger);
      for (let index = 0; index < trace.count; index++) {
        peak = Math.max(peak, Math.abs(trace.scratch[index] as number));
      }
    }
    this.updateAxes(peak, duration, false);
    for (const trace of this.traces) {
      if (trace.path.visible) {
        this.drawSamples(trace.path, trace.scratch, trace.count, 0);
      }
    }
    if (this.clippingGuides && this.options.clippingRangeProperty) {
      const limit = this.options.clippingRangeProperty.value;
      this.drawGuide(this.clippingGuides[0], limit);
      this.drawGuide(this.clippingGuides[1], -limit);
    }
    if (this.guide && this.meanLabel) {
      this.drawGuide(this.guide, mean);
      this.meanLabel.string = formatValue(instrumentStrings.charts.meanStringProperty.value, mean, 3);
      this.meanLabel.right = this.options.width - CHART_SETTINGS.RIGHT;
    }
    let right: number = this.options.width - CHART_SETTINGS.RIGHT;
    for (let index = this.visibleLabels.length - 1; index >= 0; index--) {
      const label = this.visibleLabels[index];
      if (label?.visible) {
        label.right = right;
        right = label.left - CHART_SETTINGS.RIGHT;
      }
    }
  }
}
