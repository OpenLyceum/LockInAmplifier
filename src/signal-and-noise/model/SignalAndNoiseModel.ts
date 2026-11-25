/** Samples a weak signal and seeded input noise, and averages non-overlapping Hann records. */
import { BooleanProperty, DerivedProperty, Multilink, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { NoiseSource } from "../../common/model/NoiseSource.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { SampleClock } from "../../common/model/SampleClock.js";
import { SignalSource } from "../../common/model/SignalSource.js";
import { computeMagnitudeSpectrum, createSpectrumScratch } from "../../common/model/Spectrum.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SIGNAL_NOISE_SETTINGS,
  SPECTRUM_SETTINGS,
} from "../../LockInAmplifierConstants.js";

const settings = SIGNAL_NOISE_SETTINGS;
const { RECORD_LENGTHS, AVERAGE_COUNTS } = SPECTRUM_SETTINGS;
const pinkCorners = Object.values(NOISE_SETTINGS.PINK_CORNERS);

function snrDb(signal: number, noise: number): number {
  return signal === 0 && noise === 0 ? NaN : 20 * Math.log10(signal / noise);
}

/** Stores the most recent completed records as powers, using a running sum per bin. */
class SpectrumAverage {
  private readonly record: Float64Array;
  public readonly magnitudes: Float64Array;
  private readonly scratch: ReturnType<typeof createSpectrumScratch>;
  private readonly records: Float64Array;
  private readonly sum: Float64Array;
  private sampleIndex = 0;
  private next = 0;
  public count = 0;

  private readonly averages: number;

  public constructor(size: number, averages: number) {
    this.averages = averages;
    this.scratch = createSpectrumScratch(size);
    this.record = new Float64Array(size);
    this.magnitudes = this.scratch.magnitudes;
    this.sum = new Float64Array(this.magnitudes.length);
    this.records = new Float64Array(this.magnitudes.length * averages);
  }

  public get rbw(): number {
    return this.scratch.rbw;
  }

  /** Add one sample. A completed record replaces the oldest record in the average. */
  public push(sample: number): void {
    this.record[this.sampleIndex++] = sample;
    if (this.sampleIndex !== this.record.length) {
      return;
    }
    this.sampleIndex = 0;
    computeMagnitudeSpectrum(this.record, this.scratch);
    this.count = Math.min(this.count + 1, this.averages);
    const offset = this.next * this.sum.length;
    for (let bin = 0; bin < this.sum.length; bin++) {
      const power = (this.magnitudes[bin] as number) ** 2;
      const index = offset + bin;
      const total = (this.sum[bin] as number) - (this.records[index] as number) + power;
      this.records[index] = power;
      this.sum[bin] = total;
      this.magnitudes[bin] = Math.sqrt(Math.max(0, total) / this.count);
    }
    this.next = (this.next + 1) % this.averages;
  }

  public reset(): void {
    this.sampleIndex = 0;
    this.next = 0;
    this.count = 0;
    this.records.fill(0);
    this.sum.fill(0);
  }
}

export class SignalAndNoiseModel implements TModel {
  public readonly timer = new TimeModel({ initiallyPlaying: true });
  private readonly clock = new SampleClock();
  private readonly signal = new SignalSource();
  private readonly noise = new NoiseSource();
  private sampleCount = 0;

  /** Synchronized histories used by the triggered scope. */
  public readonly traces = {
    input: new RingBuffer(RECORD_LENGTHS[2]),
    signal: new RingBuffer(RECORD_LENGTHS[2]),
  };
  public readonly phaseHistory = new RingBuffer(RECORD_LENGTHS[2]);

  public readonly amplitudeProperty = new NumberProperty(settings.AMPLITUDE, {
    range: new Range(...settings.AMPLITUDE_RANGE),
  });
  public readonly frequencyProperty = new NumberProperty(settings.FREQUENCY, {
    range: new Range(...settings.FREQUENCY_RANGE),
  });
  public readonly densityProperty = new NumberProperty(settings.DENSITY, {
    range: new Range(...settings.DENSITY_RANGE),
  });
  public readonly pinkCornerProperty = new NumberProperty(NOISE_SETTINGS.PINK_CORNERS.OFF, {
    validValues: pinkCorners,
  });
  public readonly mainsAmplitudeProperty = new NumberProperty(0, { range: new Range(...settings.MAINS_RANGE) });
  public readonly recordLengthProperty = new NumberProperty(settings.RECORD_LENGTH, {
    validValues: [...RECORD_LENGTHS],
  });
  public readonly averagesProperty = new NumberProperty(settings.AVERAGES, { validValues: [...AVERAGE_COUNTS] });
  public readonly bandwidthProperty = new NumberProperty(settings.BANDWIDTH, {
    range: new Range(...settings.BANDWIDTH_RANGE),
  });
  public readonly showSignalProperty = new BooleanProperty(false);
  public readonly showBandProperty = new BooleanProperty(false);

  public readonly signalRmsProperty = new DerivedProperty(
    [this.amplitudeProperty],
    (amplitude) => amplitude / Math.SQRT2,
  );
  private readonly noiseSetup = Multilink.multilink(
    [this.densityProperty, this.pinkCornerProperty, this.mainsAmplitudeProperty],
    (density, corner, mains) => {
      this.noise.whiteDensity = density;
      this.noise.pinkCorner = pinkCorners.find((frequency) => frequency === corner) ?? NOISE_SETTINGS.PINK_CORNERS.OFF;
      this.noise.mainsAmplitude = mains;
    },
  );
  public readonly noiseRmsProperty = new DerivedProperty(
    [this.densityProperty, this.pinkCornerProperty, this.mainsAmplitudeProperty],
    () => this.noise.stationaryRms(),
  );
  public readonly wideSnrProperty = new DerivedProperty([this.signalRmsProperty, this.noiseRmsProperty], snrDb);
  public readonly bandSnrProperty = new DerivedProperty(
    [
      this.signalRmsProperty,
      this.frequencyProperty,
      this.densityProperty,
      this.pinkCornerProperty,
      this.bandwidthProperty,
    ],
    (rms, frequency, _density, _corner, bandwidth) =>
      snrDb(rms, this.noise.densityAt(frequency) * Math.sqrt(bandwidth)),
  );

  private spectrum = new SpectrumAverage(settings.RECORD_LENGTH, settings.AVERAGES);
  private readonly completedRecordsProperty = new NumberProperty(0);
  public get averagedRecordsProperty(): TReadOnlyProperty<number> {
    return this.completedRecordsProperty;
  }
  private readonly spectrumSetup = Multilink.lazyMultilink(
    [this.recordLengthProperty, this.averagesProperty],
    (size, count) => {
      this.spectrum = new SpectrumAverage(size, count);
      this.completedRecordsProperty.reset();
    },
  );
  private readonly inputProperties = [
    this.amplitudeProperty,
    this.frequencyProperty,
    this.densityProperty,
    this.pinkCornerProperty,
    this.mainsAmplitudeProperty,
  ] as const;
  private readonly spectrumInvalidation = Multilink.lazyMultilink(this.inputProperties, () => this.clearSpectrum());

  private clearSpectrum(): void {
    this.spectrum.reset();
    this.completedRecordsProperty.reset();
  }

  /** Current completed spectrum, or no data while the first record fills. */
  public get spectrumMagnitudes(): Float64Array | null {
    return this.spectrum.count > 0 ? this.spectrum.magnitudes : null;
  }

  public get rbw(): number {
    return this.spectrum.rbw;
  }

  public step(dt: number): void {
    const due = this.clock.samplesDue(this.timer.scaledDt(dt));
    if (!due) {
      return;
    }
    this.signal.amplitude = this.amplitudeProperty.value;
    this.signal.frequency = this.frequencyProperty.value;
    for (let i = 0; i < due; i++) {
      const time = ++this.sampleCount / SAMPLING_SETTINGS.SAMPLE_RATE;
      const clean = this.signal.valueAt(time);
      const input = clean + this.noise.sample(time);
      this.traces.input.push(input);
      this.traces.signal.push(clean);
      this.phaseHistory.push(this.signal.carrierPhaseAt(time));
      this.spectrum.push(input);
    }
    this.completedRecordsProperty.value = this.spectrum.count;
    this.timer.advance(due * this.clock.dt);
  }

  public reset(): void {
    this.timer.reset();
    this.clock.reset();
    this.sampleCount = 0;
    for (const property of [
      ...this.inputProperties,
      this.recordLengthProperty,
      this.averagesProperty,
      this.bandwidthProperty,
      this.showSignalProperty,
      this.showBandProperty,
    ]) {
      property.reset();
    }
    this.signal.reset();
    this.noise.reset();
    this.traces.input.reset();
    this.traces.signal.reset();
    this.phaseHistory.reset();
    this.clearSpectrum();
  }

  public dispose(): void {
    this.spectrumInvalidation.dispose();
    this.spectrumSetup.dispose();
    this.completedRecordsProperty.dispose();
    this.bandSnrProperty.dispose();
    this.wideSnrProperty.dispose();
    this.noiseRmsProperty.dispose();
    this.signalRmsProperty.dispose();
    this.noiseSetup.dispose();
    for (const property of [
      ...this.inputProperties,
      this.recordLengthProperty,
      this.averagesProperty,
      this.bandwidthProperty,
      this.showSignalProperty,
      this.showBandProperty,
    ]) {
      property.dispose();
    }
    this.clock.dispose();
    this.timer.dispose();
  }
}
