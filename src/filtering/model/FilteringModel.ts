/** A locked single-phase detector and a rolling window of its output. */
import { DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { TimeSpeed } from "scenerystack/scenery-phet";
import { Decimator } from "../../common/model/Decimator.js";
import { Demodulator } from "../../common/model/Demodulator.js";
import { Histogram } from "../../common/model/Histogram.js";
import {
  cutoff3dB,
  enbw,
  type FilterOrder,
  predictedOutputNoise,
  settlingTime,
} from "../../common/model/LockInMath.js";
import { NoiseSource } from "../../common/model/NoiseSource.js";
import { ReferenceOscillator } from "../../common/model/ReferenceOscillator.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { RunningStats } from "../../common/model/RunningStats.js";
import { SampleClock } from "../../common/model/SampleClock.js";
import { SignalSource } from "../../common/model/SignalSource.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  CHART_SETTINGS,
  FILTER_SETTINGS,
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SIGNAL_NOISE_SETTINGS,
  FILTERING_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";

type Measurement = { tau: number; n: FilterOrder; sigma: number };
const { SAMPLE_RATE, STRIP_RATE } = SAMPLING_SETTINGS;

function statsCapacity(tau: number): number {
  return Math.ceil(Math.max(settings.MINIMUM_STATS_WINDOW, settings.STATS_TIME_CONSTANTS * tau) * STRIP_RATE);
}

export class FilteringModel implements TModel {
  public readonly timer = new TimeModel({
    initiallyPlaying: true,
    timeSpeedMultipliers: new Map([
      [TimeSpeed.NORMAL, 1],
      [TimeSpeed.FAST, settings.FAST_SPEED],
    ]),
  });
  public readonly amplitudeProperty = new NumberProperty(settings.AMPLITUDE, {
    range: new Range(...settings.AMPLITUDE_RANGE),
  });
  public readonly densityProperty = new NumberProperty(settings.DENSITY, {
    range: new Range(...SIGNAL_NOISE_SETTINGS.DENSITY_RANGE),
  });
  public readonly timeConstantProperty = new NumberProperty(settings.TIME_CONSTANT, {
    validValues: [...FILTER_SETTINGS.TIME_CONSTANTS],
  });
  public readonly orderProperty = new NumberProperty(settings.ORDER, {
    validValues: Object.values(FILTER_SETTINGS.ORDERS),
  });
  public readonly measurementsProperty = new Property<readonly Measurement[]>([]);
  public readonly xProperty = new NumberProperty(settings.AMPLITUDE);
  public readonly measuredSigmaProperty = new Property(NaN);
  private readonly mutableMeasurementProgressProperty = new NumberProperty(0, { range: new Range(0, 1) });
  public readonly measurementProgressProperty: TReadOnlyProperty<number> = this.mutableMeasurementProgressProperty;
  public readonly stepTimeProperty = new Property<number | null>(null);
  public readonly history = new RingBuffer(Math.max(...CHART_SETTINGS.STRIP_WINDOWS) * STRIP_RATE + 1);
  public readonly histogram = new Histogram();
  public readonly enbwProperty = new DerivedProperty([this.timeConstantProperty, this.orderProperty], (tau, n) =>
    enbw(tau, n as FilterOrder),
  );
  public readonly cutoffProperty = new DerivedProperty([this.timeConstantProperty, this.orderProperty], (tau, n) =>
    cutoff3dB(tau, n as FilterOrder),
  );
  public readonly settlingTimeProperty = new DerivedProperty(
    [this.timeConstantProperty, this.orderProperty],
    (tau, n) => settlingTime(tau, n as FilterOrder),
  );
  public readonly predictedSigmaProperty = new DerivedProperty(
    [this.densityProperty, this.timeConstantProperty, this.orderProperty],
    (density, tau, n) => predictedOutputNoise(density, tau, n as FilterOrder),
  );
  public readonly snrProperty = new DerivedProperty(
    [this.amplitudeProperty, this.measuredSigmaProperty],
    (amplitude, sigma) => amplitude / sigma,
  );

  private readonly clock = new SampleClock();
  private readonly source = new SignalSource({ amplitude: settings.AMPLITUDE });
  private readonly reference = new ReferenceOscillator(this.source);
  private readonly noise: NoiseSource;
  private readonly decimator = new Decimator();
  private readonly histogramScratch = new Float64Array(statsCapacity(Math.max(...FILTER_SETTINGS.TIME_CONSTANTS)));
  private demodulator = this.createDetector();
  private requiredSamples = statsCapacity(settings.TIME_CONSTANT);
  private stats = new RunningStats(this.requiredSamples);
  private statsStart = 0;
  private sampleIndex = 0;
  private statCount = 0;

  public constructor(seed: number = NOISE_SETTINGS.DEFAULT_SEED) {
    this.noise = new NoiseSource({ seed, whiteDensity: settings.DENSITY });
    this.demodulator.reset(settings.AMPLITUDE);
    this.amplitudeProperty.lazyLink((value) => {
      this.source.amplitude = value;
      this.restartStatistics();
    });
    this.densityProperty.lazyLink((value) => {
      this.noise.whiteDensity = value;
      this.restartStatistics();
    });
    this.timeConstantProperty.lazyLink((tau) => {
      this.demodulator.setTimeConstant(tau);
      this.requiredSamples = statsCapacity(tau);
      this.stats = new RunningStats(this.requiredSamples);
      this.restartStatistics();
    });
    this.restartStatistics();
    this.orderProperty.lazyLink(() => {
      const x = this.demodulator.x;
      this.demodulator = this.createDetector();
      this.demodulator.reset(x);
      this.restartStatistics();
    });
  }

  public get statistics(): RunningStats {
    return this.stats;
  }
  public get hasStatistics(): boolean {
    return this.statCount >= 2;
  }

  private createDetector(): Demodulator {
    return new Demodulator({
      timeConstant: this.timeConstantProperty.value,
      order: this.orderProperty.value as FilterOrder,
      phaseOnly: true,
    });
  }

  private restartStatistics(): void {
    this.stats.reset();
    this.statCount = 0;
    this.statsStart = this.sampleIndex / SAMPLE_RATE + this.settlingTimeProperty.value;
    this.measuredSigmaProperty.value = NaN;
    this.mutableMeasurementProgressProperty.reset();
  }

  /** Start a reproducible off-to-on transition at the current simulation time. */
  public applyStep(): void {
    this.demodulator.reset();
    this.xProperty.value = 0;
    this.decimator.reset();
    this.history.reset();
    this.history.push(0);
    this.stepTimeProperty.value = this.clock.timeProperty.value;
    this.restartStatistics();
    this.timer.isPlayingProperty.value = true;
  }

  public recordSigma(): void {
    if (this.measurementProgressProperty.value === 1) {
      this.measurementsProperty.value = [
        ...this.measurementsProperty.value,
        {
          tau: this.timeConstantProperty.value,
          n: this.orderProperty.value as FilterOrder,
          sigma: this.measuredSigmaProperty.value,
        },
      ];
    }
  }

  public clearMeasurements(): void {
    this.measurementsProperty.reset();
  }

  public updateHistogram(): void {
    this.histogram.update(this.stats, this.histogramScratch);
  }

  public step(dt: number): void {
    const maxStep = this.timer.timeSpeedProperty.value === TimeSpeed.FAST ? settings.FAST_MAX_STEP_SECONDS : undefined;
    const count = this.clock.samplesDue(this.timer.scaledDt(dt), maxStep);
    if (count === 0) {
      return;
    }
    for (let i = 0; i < count; i++) {
      const t = ++this.sampleIndex / SAMPLE_RATE;
      this.demodulator.processSample(this.source.valueAt(t) + this.noise.sample(t), this.reference.inPhase(t), 0);
      const x = this.demodulator.x;
      const average = this.decimator.process(x);
      if (average !== undefined) {
        this.history.push(average);
        // Sample X directly so anti-alias averaging does not narrow the measured distribution.
        if (t > this.statsStart) {
          this.stats.push(x);
          this.statCount++;
        }
      }
    }
    this.xProperty.value = this.demodulator.x;
    const progress = Math.min(this.statCount / this.requiredSamples, 1);
    if (progress === 1) {
      this.measuredSigmaProperty.value = this.stats.standardDeviation;
    }
    this.mutableMeasurementProgressProperty.value = progress;
    this.timer.advance(count / SAMPLE_RATE);
  }

  public reset(): void {
    this.sampleIndex = 0;
    this.timer.reset();
    this.clock.reset();
    this.source.reset();
    this.reference.reset();
    this.noise.reset();
    this.amplitudeProperty.reset();
    this.densityProperty.reset();
    this.timeConstantProperty.reset();
    this.orderProperty.reset();
    this.demodulator.reset(this.amplitudeProperty.value);
    this.decimator.reset();
    this.history.reset();
    this.restartStatistics();
    this.stepTimeProperty.reset();
    this.xProperty.reset();
    this.clearMeasurements();
    this.updateHistogram();
  }

  public dispose(): void {
    this.enbwProperty.dispose();
    this.cutoffProperty.dispose();
    this.settlingTimeProperty.dispose();
    this.predictedSigmaProperty.dispose();
    this.snrProperty.dispose();
    this.amplitudeProperty.dispose();
    this.densityProperty.dispose();
    this.timeConstantProperty.dispose();
    this.orderProperty.dispose();
    this.measurementsProperty.dispose();
    this.xProperty.dispose();
    this.measuredSigmaProperty.dispose();
    this.mutableMeasurementProgressProperty.dispose();
    this.stepTimeProperty.dispose();
    this.clock.dispose();
    this.reference.dispose();
    this.timer.dispose();
  }
}
