/** Samples a single-phase lock-in and exposes synchronized histories at its four probe points. */
import {
  BooleanProperty,
  DerivedProperty,
  Multilink,
  NumberProperty,
  StringUnionProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { Decimator } from "../../common/model/Decimator.js";
import { Demodulator } from "../../common/model/Demodulator.js";
import { NoiseSource } from "../../common/model/NoiseSource.js";
import { ReferenceOscillator } from "../../common/model/ReferenceOscillator.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { RunningStats } from "../../common/model/RunningStats.js";
import { SampleClock } from "../../common/model/SampleClock.js";
import { SignalSource } from "../../common/model/SignalSource.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  FILTER_SETTINGS,
  MIXING_SETTINGS,
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SPECTRUM_SETTINGS,
} from "../../LockInAmplifierConstants.js";

const settings = MIXING_SETTINGS;
const { SAMPLE_RATE, STRIP_RATE } = SAMPLING_SETTINGS;
const capacity = SPECTRUM_SETTINGS.RECORD_LENGTHS[2];
const ReferenceWaveform = { SINE: "sine", SQUARE: "square" } as const;
const orders = Object.values(FILTER_SETTINGS.ORDERS);

export class MixingModel implements TModel {
  public readonly timer = new TimeModel({ initiallyPlaying: true });
  private readonly clock = new SampleClock();
  private readonly signal = new SignalSource();
  private readonly noise: NoiseSource;
  private readonly reference = new ReferenceOscillator(this.signal, { frequency: settings.FREQUENCY });
  private readonly filters = {
    1: new Demodulator({ phaseOnly: true, order: 1 }),
    2: new Demodulator({ phaseOnly: true, order: 2 }),
    3: new Demodulator({ phaseOnly: true, order: 3 }),
    4: new Demodulator({ phaseOnly: true, order: 4 }),
  };
  private demodulator = this.filters[settings.ORDER];
  private readonly decimator = new Decimator();
  private sampleCount = 0;

  public readonly traces = {
    input: new RingBuffer(capacity),
    reference: new RingBuffer(capacity),
    product: new RingBuffer(capacity),
    output: new RingBuffer(capacity),
  };
  public readonly phaseHistory = new RingBuffer(capacity);
  public readonly outputHistory = new RingBuffer(STRIP_RATE * settings.STRIP_WINDOW + 1);
  private readonly productStats = new RunningStats(SAMPLE_RATE * settings.DC_AVERAGE_SECONDS);

  public readonly amplitudeProperty = new NumberProperty(settings.AMPLITUDE, {
    range: new Range(...settings.AMPLITUDE_RANGE),
  });
  public readonly noiseEnabledProperty = new BooleanProperty(false);
  public readonly thirdHarmonicProperty = new BooleanProperty(false);
  public readonly lockedProperty = this.reference.lockedProperty;
  public readonly referenceFrequencyProperty = new NumberProperty(settings.FREQUENCY, {
    range: new Range(...settings.REFERENCE_RANGE),
  });
  public readonly phaseProperty = new NumberProperty(0, { range: new Range(...settings.PHASE_RANGE) });
  public readonly waveformProperty = new StringUnionProperty(ReferenceWaveform.SINE, {
    validValues: Object.values(ReferenceWaveform),
  });
  public readonly timeConstantProperty = new NumberProperty(settings.TIME_CONSTANT, {
    validValues: [...FILTER_SETTINGS.TIME_CONSTANTS],
  });
  public readonly orderProperty = new NumberProperty(settings.ORDER, { validValues: orders });
  public readonly effectiveReferenceProperty = new DerivedProperty(
    [this.lockedProperty, this.referenceFrequencyProperty],
    (locked, frequency) => (locked ? settings.FREQUENCY : frequency),
  );
  private readonly currentOutputProperty = new NumberProperty(0);
  public get outputProperty(): TReadOnlyProperty<number> {
    return this.currentOutputProperty;
  }

  private readonly inputProperties = [
    this.amplitudeProperty,
    this.noiseEnabledProperty,
    this.thirdHarmonicProperty,
    this.referenceFrequencyProperty,
    this.phaseProperty,
    this.waveformProperty,
  ] as const;

  private readonly clearMean = Multilink.lazyMultilink([...this.inputProperties, this.lockedProperty], () =>
    this.productStats.reset(),
  );
  private readonly filterSetup = Multilink.multilink([this.timeConstantProperty, this.orderProperty], (tau, order) => {
    const filterOrder = orders.find((candidate) => candidate === order) ?? settings.ORDER;
    const filter = this.filters[filterOrder];
    if (filter !== this.demodulator) {
      filter.reset(this.demodulator.x);
      this.demodulator = filter;
    }
    this.demodulator.setTimeConstant(tau);
  });

  /** Rolling mean of the unfiltered product in volts. */
  public get productMean(): number {
    return this.productStats.mean;
  }

  public constructor(seed: number = NOISE_SETTINGS.DEFAULT_SEED) {
    this.noise = new NoiseSource({ seed });
  }

  public step(dt: number): void {
    const due = this.clock.samplesDue(this.timer.scaledDt(dt));
    if (!due) {
      return;
    }
    const amplitude = this.amplitudeProperty.value;
    const thirdHarmonic = this.thirdHarmonicProperty.value ? amplitude : 0;
    this.signal.frequency = settings.FREQUENCY;
    this.noise.whiteDensity = this.noiseEnabledProperty.value ? settings.NOISE_DENSITY : 0;
    this.reference.frequency = this.referenceFrequencyProperty.value;
    this.reference.phase = this.phaseProperty.value;
    this.reference.waveform = this.waveformProperty.value;
    let newestOutput = this.currentOutputProperty.value;

    for (let i = 0; i < due; i++) {
      const time = ++this.sampleCount / SAMPLE_RATE;
      const phase = this.signal.carrierPhaseAt(time);
      const input = amplitude * Math.sin(phase) + thirdHarmonic * Math.sin(3 * phase) + this.noise.sample(time);
      const reference = this.reference.inPhase(time);
      this.demodulator.processSample(input, reference, 0);
      const product = this.demodulator.xMix;
      const output = this.demodulator.x;
      this.traces.input.push(input);
      this.traces.reference.push(reference);
      this.traces.product.push(product);
      this.traces.output.push(output);
      this.phaseHistory.push(this.reference.carrierPhaseAt(time));
      this.productStats.push(product);
      const decimated = this.decimator.process(output);
      if (decimated !== undefined) {
        this.outputHistory.push(decimated);
        newestOutput = decimated;
      }
    }
    this.currentOutputProperty.value = newestOutput;
    this.timer.advance(due * this.clock.dt);
  }

  public reset(): void {
    this.timer.reset();
    this.clock.reset();
    this.sampleCount = 0;
    for (const property of [...this.inputProperties, this.timeConstantProperty, this.orderProperty]) {
      property.reset();
    }
    this.signal.reset();
    this.reference.reset();
    this.noise.reset();
    this.demodulator.reset();
    this.decimator.reset();
    for (const trace of Object.values(this.traces)) {
      trace.reset();
    }
    this.phaseHistory.reset();
    this.productStats.reset();
    this.outputHistory.reset();
    this.currentOutputProperty.reset();
  }

  public dispose(): void {
    this.clearMean.dispose();
    this.filterSetup.dispose();
    this.effectiveReferenceProperty.dispose();
    for (const property of [
      ...this.inputProperties,
      this.timeConstantProperty,
      this.orderProperty,
      this.currentOutputProperty,
    ]) {
      property.dispose();
    }
    this.reference.dispose();
    this.clock.dispose();
    this.timer.dispose();
  }
}
