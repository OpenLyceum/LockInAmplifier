/** Owns the Lab scenarios and their shared, fixed-rate acquisition pipeline. */
import { Random, roundSymmetric } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { Decimator } from "../../common/model/Decimator.js";
import { Demodulator } from "../../common/model/Demodulator.js";
import { Histogram } from "../../common/model/Histogram.js";
import { NoiseSource } from "../../common/model/NoiseSource.js";
import { ReferenceOscillator } from "../../common/model/ReferenceOscillator.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { RunningStats } from "../../common/model/RunningStats.js";
import { SampleClock } from "../../common/model/SampleClock.js";
import {
  averagedPowerSpectrum,
  computeMagnitudeSpectrum,
  type createSpectrumScratch,
} from "../../common/model/Spectrum.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  LAB_SETTINGS,
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SPECTRUM_SETTINGS,
  STATISTICS_SETTINGS,
} from "../../LockInAmplifierConstants.js";
import { BridgeScenario } from "./scenarios/BridgeScenario.js";
import { ChoppedLightScenario } from "./scenarios/ChoppedLightScenario.js";
import type { LabScenario } from "./scenarios/LabScenario.js";
import { RcFilterScenario } from "./scenarios/RcFilterScenario.js";

const WINDOW_SAMPLES = STATISTICS_SETTINGS.WINDOW_SECONDS * SAMPLING_SETTINGS.STRIP_RATE;
const MAX_RECORD = SPECTRUM_SETTINGS.RECORD_LENGTHS[2];
const SCOPE_CAPACITY = MAX_RECORD + Math.ceil(SAMPLING_SETTINGS.SAMPLE_RATE / LAB_SETTINGS.CHOP_FREQUENCY_RANGE[0]);

export class VirtualExperimentModel implements TModel {
  public readonly timer = new TimeModel();
  public readonly clock = new SampleClock();

  /** Available experiments, each with its own controls and hidden quantities. */
  public readonly scenarios = {
    choppedLight: new ChoppedLightScenario(),
    bridge: new BridgeScenario(),
    rcFilter: new RcFilterScenario(),
  };
  private activeScenario: LabScenario = this.scenarios.choppedLight;
  private readonly random = new Random({ seed: NOISE_SETTINGS.DEFAULT_SEED });

  public readonly reference = new ReferenceOscillator(this.scenarios.choppedLight.chopper);
  public readonly noise = new NoiseSource({
    whiteDensity: LAB_SETTINGS.INPUT_NOISE_DENSITY,
    driftRate: LAB_SETTINGS.DRIFT_RATE,
  });
  public readonly demodulator = new Demodulator();

  private readonly scopeInput = new RingBuffer(SCOPE_CAPACITY);
  private readonly scopePhase = new RingBuffer(SCOPE_CAPACITY);
  private readonly decimator = new Decimator();
  public readonly xStatistics = new RunningStats(WINDOW_SAMPLES);
  private readonly histogram = new Histogram();
  private readonly histogramScratch = new Float64Array(WINDOW_SAMPLES);

  public constructor() {
    for (const scenario of Object.values(this.scenarios)) {
      scenario.randomize(this.random);
    }
  }

  /** Start acquisition of the selected experiment with an empty history. */
  public selectScenario(key: keyof typeof this.scenarios): void {
    this.activeScenario = this.scenarios[key];
    this.resetAcquisition();
  }

  /** Start a different unknown for the selected experiment using the Lab's seeded stream. */
  public randomizeScenario(): void {
    this.activeScenario.randomize(this.random);
    this.resetAcquisition();
  }

  /** Return a snapshot of the selected experiment's unknowns. */
  public reveal(): Record<string, number> {
    return this.activeScenario.reveal();
  }

  /** Copy the latest triggered input trace into the caller's storage. */
  public copyScopeTrace(out: Float64Array): number {
    return this.scopeInput.copyTriggered(out.length, out, this.scopePhase);
  }

  /** Read a spectrum of the latest full record, reusing caller-owned scratch. */
  public readSpectrum(
    record: Float64Array,
    scratch: ReturnType<typeof createSpectrumScratch>,
  ): Float64Array | undefined {
    return this.scopeInput.copyLatest(record.length, record) === record.length
      ? computeMagnitudeSpectrum(record, scratch)
      : undefined;
  }

  /** Average previously captured full records using the same normalization as the live spectrum. */
  public readAveragedPower(
    records: readonly Float64Array[],
    scratch: ReturnType<typeof createSpectrumScratch>,
  ): Float64Array {
    return averagedPowerSpectrum(records, scratch);
  }

  /** Refresh the histogram from the current decimated X window. */
  public readHistogram(): Histogram {
    this.histogram.update(this.xStatistics, this.histogramScratch);
    return this.histogram;
  }

  /** Reset Lab acquisition. The current experiment and unknown stay selected. */
  public reset(): void {
    this.timer.reset();
    this.resetAcquisition();
  }

  private resetAcquisition(): void {
    this.timer.timeProperty.reset();
    this.clock.reset();
    this.scenarios.choppedLight.chopper.reset();
    this.reference.reset();
    this.reference.lockedProperty.value = this.activeScenario === this.scenarios.choppedLight;
    this.noise.reset();
    this.demodulator.reset();
    this.scopeInput.reset();
    this.scopePhase.reset();
    this.decimator.reset();
    this.xStatistics.reset();
    this.histogram.reset();
  }

  /** Schedule a capped batch and process samples in order without allocating. */
  public step(dt: number): void {
    const due = this.clock.samplesDue(this.timer.scaledDt(dt));
    if (due === 0) {
      return;
    }
    const endTime = this.clock.timeProperty.value;
    const sampleDt = this.clock.dt;
    const lastSample = roundSymmetric(endTime * SAMPLING_SETTINGS.SAMPLE_RATE);
    this.scenarios.choppedLight.mainsFrequency = this.noise.mainsFrequency;
    for (let sample = lastSample - due; sample < lastSample; sample++) {
      const t = sample * sampleDt;
      const input = this.activeScenario.inputAt(t, this.reference) + this.noise.sample(t);
      const phase = this.reference.carrierPhaseAt(t);
      this.demodulator.processSample(input, this.reference.inPhase(t), this.reference.quadrature(t));
      this.scopeInput.push(input);
      this.scopePhase.push(phase);
      const decimated = this.decimator.process(this.demodulator.x);
      if (decimated !== undefined) {
        this.xStatistics.push(decimated);
      }
    }
    this.timer.advance(due * sampleDt);
  }

  /** Release the Properties owned by the Lab and its composed models. */
  public dispose(): void {
    this.clock.dispose();
    this.reference.dispose();
    this.timer.dispose();
  }
}
