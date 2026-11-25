/** A log-frequency spectrum with finite display range and optional markers, peaks and detection band. */
import { Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Path, Rectangle, type TColor, type Text } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { SAMPLING_SETTINGS, SPECTRUM_SETTINGS, CHART_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import { ChartFrame } from "./ChartFrame.js";
import { chartLabelFont, formatValue, instrumentStrings, instrumentText } from "./instrumentText.js";

type Peak = {
  frequency: () => number | null;
  pattern?: TReadOnlyProperty<string>;
  dcLabel?: TReadOnlyProperty<string>;
};

type SpectrumOptions = ConstructorParameters<typeof ChartFrame>[0] & {
  color: TColor;
  magnitudes: () => Float64Array | null;
  dcMagnitude?: () => number;
  reference?: TReadOnlyProperty<number>;
  band?: {
    frequencyProperty: TReadOnlyProperty<number>;
    bandwidthProperty: TReadOnlyProperty<number>;
    visibleProperty: TReadOnlyProperty<boolean>;
  };
  peaks?: readonly Peak[];
  waitingMessage?: boolean;
  calculateNoiseFloor?: boolean;
};

const [minimumFrequency, maximumFrequency] = settings.FREQUENCY_RANGE;
const [minimumDb, maximumDb] = settings.DECIBEL_RANGE;
const logMinimum = Math.log10(minimumFrequency);
const logMaximum = Math.log10(maximumFrequency);
const sampleRate = SAMPLING_SETTINGS.SAMPLE_RATE;

function decibels(voltage: number): number {
  return 20 * Math.log10(voltage);
}

export class SpectrumChartNode extends ChartFrame {
  private readonly trace: Path;
  private readonly band: Rectangle | null;
  private readonly marker: Path | null;
  private readonly peakGuides: Path;
  private readonly peakDots: Path;
  private readonly peakLabels: readonly Text[];
  private readonly waitingLabel: Text | null;
  private readonly columnMagnitudes: Float64Array;
  private readonly columnCounts: Uint32Array;
  private readonly medianScratch = new Float64Array(SPECTRUM_SETTINGS.RECORD_LENGTHS[2] / 2 + 1);
  private readonly medianFloorProperty = new Property(NaN);
  private elapsed = Infinity;

  public get noiseFloorProperty(): TReadOnlyProperty<number> {
    return this.medianFloorProperty;
  }

  private readonly options: SpectrumOptions;

  public constructor(options: SpectrumOptions) {
    super(options);
    this.options = options;
    this.bag.own(this.medianFloorProperty);
    this.columnMagnitudes = new Float64Array(Math.ceil(this.plotWidth) + 1);
    this.columnCounts = new Uint32Array(this.columnMagnitudes.length);
    this.band = options.band ? new Rectangle(0, 0, 0, 0, { fill: Colors.rangeBandColorProperty }) : null;
    this.marker = options.reference
      ? new Path(null, {
          stroke: Colors.axisColorProperty,
          lineDash: [...settings.DASH],
        })
      : null;
    this.trace = new Path(null, { stroke: options.color, lineWidth: settings.TRACE_WIDTH });
    this.peakGuides = new Path(null, {
      stroke: Colors.axisColorProperty,
      lineWidth: settings.GRID_WIDTH,
      lineDash: [...settings.DASH],
    });
    this.peakDots = new Path(null, { fill: options.color });

    const layers = [this.band, this.marker, this.trace, this.peakGuides, this.peakDots];
    for (const layer of layers) {
      if (layer) {
        this.plot.addChild(layer);
        this.bag.own(layer);
      }
    }
    this.peakLabels = (options.peaks ?? []).map(() =>
      instrumentText(instrumentStrings.units.unavailableStringProperty.value, {
        font: chartLabelFont,
        fill: options.color,
        visible: false,
        centerY: (options.compact ? settings.COMPACT_TOP : settings.TOP) / 2,
        maxWidth: settings.MIN_PEAK_LABEL_GAP,
      }),
    );
    for (const label of this.peakLabels) {
      this.header.addChild(label);
      this.bag.own(label);
    }
    this.waitingLabel = options.waitingMessage
      ? instrumentText(instrumentStrings.charts.waitingStringProperty, {
          fill: Colors.mutedTextColorProperty,
          centerX: this.plotWidth / 2,
          centerY: this.plotHeight / 2,
        })
      : null;
    if (this.waitingLabel) {
      this.plot.addChild(this.waitingLabel);
      this.bag.own(this.waitingLabel);
    }

    const logSpan = logMaximum - logMinimum;
    const dc = options.dcMagnitude
      ? logMinimum - (logSpan * settings.DC_GUTTER) / (this.plotWidth - settings.DC_GUTTER)
      : logMinimum;
    const tickPattern = instrumentStrings.charts.decadeKStringProperty;
    const drawAxes = (): void => {
      const kilo = 1000;
      const xTicks = settings.SPECTRUM_TICKS.map((frequency) => ({
        value: Math.log10(frequency),
        label: frequency >= kilo ? formatValue(tickPattern.value, frequency / kilo, 0) : String(frequency),
      }));
      if (options.dcMagnitude) {
        xTicks.unshift({
          value: (dc + logMinimum) / 2,
          label: instrumentStrings.charts.dcStringProperty.value,
        });
      }
      this.setAxes(
        new Range(dc, logMaximum),
        new Range(minimumDb, maximumDb),
        xTicks,
        (options.compact ? settings.COMPACT_SPECTRUM_LEVEL_TICKS : settings.SPECTRUM_LEVEL_TICKS).map((value) => ({
          value,
          label: String(value),
        })),
        options.showXAxis !== false,
      );
    };
    this.bag.link(tickPattern, drawAxes);
    this.bag.lazyLink(instrumentStrings.charts.dcStringProperty, drawAxes);
  }

  /** Redraw at most five times per second, reducing many FFT bins to display columns. */
  public step(dt: number): void {
    if (!this.visible) {
      return;
    }
    this.elapsed += dt;
    if (this.elapsed < 1 / settings.SPECTRUM_REDRAW_HZ) {
      return;
    }
    this.elapsed = 0;
    this.updateOverlays();
    const magnitudes = this.options.magnitudes();
    if (this.waitingLabel) {
      this.waitingLabel.visible = magnitudes === null;
    }
    const shape = new Shape();
    if (magnitudes) {
      const resolution = sampleRate / (2 * (magnitudes.length - 1));
      this.drawSpectrum(shape, magnitudes, resolution);
      this.drawPeaks(magnitudes, resolution);
    } else {
      this.medianFloorProperty.value = NaN;
      this.peakGuides.shape = null;
      this.peakDots.shape = null;
      for (const label of this.peakLabels) {
        label.visible = false;
      }
    }
    this.trace.shape = shape;
  }

  private drawSpectrum(shape: Shape, magnitudes: Float64Array, resolution: number): void {
    const firstBin = Math.ceil(minimumFrequency / resolution);
    const lastBin = Math.min(magnitudes.length - 1, Math.floor(maximumFrequency / resolution));
    this.columnMagnitudes.fill(-1);
    this.columnCounts.fill(0);
    let medianCount = 0;
    for (let bin = firstBin; bin <= lastBin; bin++) {
      const frequency = bin * resolution;
      const column = Math.floor(this.frequencyToX(frequency));
      const magnitude = magnitudes[bin] as number;
      const columnMagnitude = this.columnMagnitudes[column] as number;
      if (this.options.calculateNoiseFloor) {
        // A maximum would make the white floor rise where a log pixel includes many bins.
        this.columnMagnitudes[column] = Math.max(0, columnMagnitude) + magnitude * magnitude;
        this.columnCounts[column] = (this.columnCounts[column] as number) + 1;
        this.medianScratch[medianCount++] = magnitude;
      } else {
        this.columnMagnitudes[column] = Math.max(columnMagnitude, magnitude);
      }
    }

    if (medianCount > 0) {
      const sorted = this.medianScratch.subarray(0, medianCount).sort();
      const lower = decibels(sorted[Math.floor((medianCount - 1) / 2)] as number);
      const upper = decibels(sorted[Math.floor(medianCount / 2)] as number);
      this.medianFloorProperty.value = (lower + upper) / 2;
    }
    if (this.options.dcMagnitude) {
      const dc = this.options.dcMagnitude();
      const x = this.frequencyToX(minimumFrequency) / 2;
      if (decibels(dc) > minimumDb) {
        shape.moveTo(x, this.plotHeight).lineTo(x, this.magnitudeToY(dc));
      }
    }
    let started = false;
    for (let x = 0; x < this.columnMagnitudes.length; x++) {
      const magnitude = this.columnMagnitudes[x] as number;
      if (magnitude < 0) {
        continue;
      }
      const count = this.columnCounts[x] as number;
      const y = this.magnitudeToY(count > 0 ? Math.sqrt(magnitude / count) : magnitude);
      if (started) {
        shape.lineTo(x, y);
      } else {
        shape.moveTo(x, y);
        started = true;
      }
    }
  }

  private drawPeaks(magnitudes: Float64Array, resolution: number): void {
    const guides = new Shape();
    const dots = new Shape();
    const peaks = this.options.peaks ?? [];
    const occupied: number[] = [];
    this.peakLabels.forEach((label, index) => {
      label.visible = false;
      const peak = peaks[index];
      const frequency = peak?.frequency();
      if (!peak || typeof frequency !== "number" || frequency < 0 || frequency > maximumFrequency) {
        return;
      }
      const dc = frequency === 0 ? this.options.dcMagnitude : undefined;
      if (!dc && frequency < minimumFrequency) {
        return;
      }
      const bin = Math.floor(frequency / resolution + 0.5);
      const magnitude = dc ? dc() : (magnitudes[bin] ?? 0);
      const binFrequency = Math.max(minimumFrequency, Math.min(maximumFrequency, bin * resolution));
      const x = dc ? this.frequencyToX(minimumFrequency) / 2 : this.frequencyToX(binFrequency);
      if (decibels(magnitude) <= minimumDb) {
        return;
      }
      const y = this.magnitudeToY(magnitude);
      guides.moveTo(x, 0).lineTo(x, y);
      dots.circle(x, y, settings.PEAK_MARKER_RADIUS);
      label.string = dc
        ? (peak.dcLabel ?? instrumentStrings.charts.dcStringProperty).value
        : formatValue((peak.pattern ?? instrumentStrings.charts.peakStringProperty).value, frequency, 1, true);
      const left = this.titleNode.right - settings.LEFT + settings.AXIS_LABEL_GAP + label.width / 2;
      const labelX = Math.max(left, Math.min(this.plotWidth - label.width / 2, x));
      if (occupied.some((position) => Math.abs(position - labelX) < settings.MIN_PEAK_LABEL_GAP)) {
        return;
      }
      occupied.push(labelX);
      label.centerX = settings.LEFT + labelX;
      label.visible = true;
    });
    this.peakGuides.shape = guides;
    this.peakDots.shape = dots;
  }

  private updateOverlays(): void {
    const band = this.options.band;
    if (band && this.band) {
      this.band.visible = band.visibleProperty.value;
      if (this.band.visible) {
        const center = band.frequencyProperty.value;
        const half = band.bandwidthProperty.value / 2;
        const left = this.frequencyToX(Math.max(minimumFrequency, center - half));
        const right = this.frequencyToX(Math.min(maximumFrequency, center + half));
        this.band.setRect(left, 0, right - left, this.plotHeight);
      }
    }
    if (this.marker && this.options.reference) {
      const frequency = this.options.reference.value;
      this.marker.visible = frequency >= minimumFrequency && frequency <= maximumFrequency;
      if (this.marker.visible) {
        const x = this.frequencyToX(frequency);
        this.marker.shape = new Shape().moveTo(x, 0).lineTo(x, this.plotHeight);
      }
    }
  }

  private frequencyToX(frequency: number): number {
    return this.chartTransform.modelToViewX(Math.log10(frequency));
  }

  private magnitudeToY(magnitude: number): number {
    return this.chartTransform.modelToViewY(Math.max(minimumDb, Math.min(maximumDb, decibels(magnitude))));
  }
}
