/** Owns the Lab scenarios and their shared, fixed-rate acquisition pipeline. */
import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { clamp, Random, Range, roundSymmetric } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { Decimator } from "../../common/model/Decimator.js";
import { Demodulator } from "../../common/model/Demodulator.js";
import { Histogram } from "../../common/model/Histogram.js";
import type { FilterOrder } from "../../common/model/LockInMath.js";
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
  FILTER_SETTINGS,
  LAB_SETTINGS,
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SPECTRUM_SETTINGS,
  STATISTICS_SETTINGS,
  LAB_INSTRUMENT_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { LockInAmplifierPreferencesModel } from "../../preferences/LockInAmplifierPreferencesModel.js";
import { BridgeScenario } from "./scenarios/BridgeScenario.js";
import { ChoppedLightScenario } from "./scenarios/ChoppedLightScenario.js";
import { RcFilterScenario } from "./scenarios/RcFilterScenario.js";

const WINDOW_SAMPLES = STATISTICS_SETTINGS.WINDOW_SECONDS * SAMPLING_SETTINGS.STRIP_RATE;
const MAX_RECORD = SPECTRUM_SETTINGS.RECORD_LENGTHS[2];
const SCOPE_CAPACITY = MAX_RECORD + Math.ceil(SAMPLING_SETTINGS.SAMPLE_RATE / LAB_SETTINGS.CHOP_FREQUENCY_RANGE[0]);

type ScenarioKey = keyof typeof settings.DEFAULTS;
type Sample = ChoppedLightScenario["sampleInBeam"];
type Harmonic = ReferenceOscillator["harmonic"];

type LabReading = {
  readonly frequency: number;
  readonly phase: number;
  readonly harmonic: Harmonic;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly theta: number;
  readonly clipped: boolean;
};

export type LabRow = LabReading &
  (
    | { readonly scenario: "choppedLight"; readonly sample: Sample }
    | { readonly scenario: "bridge"; readonly strainTrim: number; readonly capacitanceTrim: number }
    | { readonly scenario: "rcFilter" }
  );

type MainsFrequencyProperty = LockInAmplifierPreferencesModel["mainsFrequencyProperty"];

export class VirtualExperimentModel implements TModel {
  public readonly timer = new TimeModel({ initiallyPlaying: true });
  public readonly clock = new SampleClock();

  /** Available experiments, each with its own controls and hidden quantities. */
  public readonly scenarios = {
    choppedLight: new ChoppedLightScenario(),
    bridge: new BridgeScenario(),
    rcFilter: new RcFilterScenario(),
  };
  public readonly scenarioProperty = new Property<ScenarioKey>("choppedLight");
  public readonly sensitivityProperty = new NumberProperty(settings.DEFAULTS.choppedLight.sensitivity);
  public readonly inputRangeProperty = new NumberProperty(settings.DEFAULTS.choppedLight.range);
  public readonly internalFrequencyLogProperty = new NumberProperty(
    Math.log10(settings.DEFAULTS.choppedLight.frequency),
    { range: new Range(Math.log10(settings.REFERENCE_RANGE[0]), Math.log10(settings.REFERENCE_RANGE[1])) },
  );
  public readonly phaseProperty = new NumberProperty(0, { range: new Range(-Math.PI, Math.PI) });
  public readonly harmonicProperty = new Property<Harmonic>(1);
  public readonly timeConstantProperty = new NumberProperty(FILTER_SETTINGS.DEFAULT_TIME_CONSTANT);
  public readonly filterOrderProperty = new Property<FilterOrder>(FILTER_SETTINGS.ORDERS.FOURTH);
  public readonly firstDisplayProperty = new Property<"x" | "r">("x");
  public readonly secondDisplayProperty = new Property<"y" | "theta">("y");
  public readonly chopperFrequencyProperty = new NumberProperty(LAB_SETTINGS.INITIAL_CHOP_FREQUENCY, {
    range: new Range(...LAB_SETTINGS.CHOP_FREQUENCY_RANGE),
  });
  public readonly sampleProperty = new Property<Sample>("none");
  public readonly strainTrimProperty = new NumberProperty(0, { range: new Range(...settings.TRIM_STRAIN_RANGE) });
  public readonly capacitanceTrimProperty = new NumberProperty(0, {
    range: new Range(...settings.TRIM_CAPACITANCE_RANGE),
  });
  public readonly noiseDensityProperty = new NumberProperty(LAB_SETTINGS.INPUT_NOISE_DENSITY, {
    range: new Range(0, settings.HIGH_NOISE_DENSITY),
  });
  public readonly inputOverloadProperty = new BooleanProperty(false);
  public readonly referenceUnlockProperty = new BooleanProperty(false);
  public readonly externalAvailableProperty = new BooleanProperty(true);
  public readonly rowsProperty = new Property<readonly LabRow[]>([]);
  public chopperAngle = 0;
  public readonly scopeInput = new RingBuffer(SCOPE_CAPACITY);
  public readonly scopePhase = new RingBuffer(SCOPE_CAPACITY);

  private activeScenario = this.scenarios.choppedLight as (typeof this.scenarios)[ScenarioKey];
  private readonly savedNotebooks = new Map<ScenarioKey, readonly LabRow[]>();
  private lockUntil = 0;
  private overloadUntil = 0;
  private lastExternalFrequency = LAB_SETTINGS.INITIAL_CHOP_FREQUENCY as number;
  private wasExternal = true;
  private readonly random: Random;
  private readonly seed: number;

  public readonly reference = new ReferenceOscillator(this.scenarios.choppedLight.chopper, { followSignalPhase: true });
  private readonly unlinkMainsFrequency?: () => void;
  public readonly noise: NoiseSource;
  public demodulator = new Demodulator();

  private readonly controls = [
    this.sensitivityProperty,
    this.inputRangeProperty,
    this.internalFrequencyLogProperty,
    this.phaseProperty,
    this.harmonicProperty,
    this.timeConstantProperty,
    this.filterOrderProperty,
    this.firstDisplayProperty,
    this.secondDisplayProperty,
    this.chopperFrequencyProperty,
    this.sampleProperty,
    this.strainTrimProperty,
    this.capacitanceTrimProperty,
    this.noiseDensityProperty,
  ];
  private readonly decimator = new Decimator();
  public readonly xStatistics = new RunningStats(WINDOW_SAMPLES);
  private readonly histogram = new Histogram();
  private readonly histogramScratch = new Float64Array(WINDOW_SAMPLES);

  public constructor(seed: number = NOISE_SETTINGS.DEFAULT_SEED, mainsFrequencyProperty?: MainsFrequencyProperty) {
    this.random = new Random({ seed });
    this.seed = seed;
    this.noise = new NoiseSource({
      seed,
      whiteDensity: LAB_SETTINGS.INPUT_NOISE_DENSITY,
      driftRate: LAB_SETTINGS.DRIFT_RATE,
    });
    if (mainsFrequencyProperty) {
      const update = (frequency: MainsFrequencyProperty["value"]) => {
        this.noise.mainsFrequency = frequency;
      };
      mainsFrequencyProperty.link(update);
      this.unlinkMainsFrequency = () => mainsFrequencyProperty.unlink(update);
    }
    this.randomizeAll();
    this.scenarioProperty.lazyLink((key, previousScenario) => {
      this.savedNotebooks.set(previousScenario, this.rowsProperty.value);
      this.activeScenario = this.scenarios[key];
      const defaults = settings.DEFAULTS[key];
      this.externalAvailableProperty.value = key === "choppedLight";
      this.sensitivityProperty.value = defaults.sensitivity;
      this.inputRangeProperty.value = defaults.range;
      this.internalFrequencyLogProperty.value = Math.log10(defaults.frequency);
      this.noiseDensityProperty.value = defaults.density;
      this.reference.lockedProperty.value = key === "choppedLight";
      this.rowsProperty.value = this.savedNotebooks.get(key) ?? [];
      this.resetAcquisition();
    });
    this.reference.lockedProperty.lazyLink((external) => {
      if (external && !this.externalAvailableProperty.value) {
        this.reference.lockedProperty.value = false;
      } else if (external) {
        this.beginRelock();
      } else {
        this.referenceUnlockProperty.value = false;
      }
    });
    this.chopperFrequencyProperty.lazyLink((frequency) => {
      this.scenarios.choppedLight.chopFrequency = frequency;
      if (this.reference.lockedProperty.value) {
        this.beginRelock();
      }
    });
    this.internalFrequencyLogProperty.link((logFrequency) => {
      this.reference.frequency = 10 ** logFrequency;
    });
    this.phaseProperty.link((phase) => {
      this.reference.phase = phase;
    });
    this.harmonicProperty.link((harmonic) => {
      this.reference.harmonic = harmonic;
    });
    this.timeConstantProperty.lazyLink((tau) => this.demodulator.setTimeConstant(tau));
    this.filterOrderProperty.lazyLink((order) => {
      this.demodulator = new Demodulator({ order, timeConstant: this.timeConstantProperty.value });
    });
    this.sampleProperty.link((sample) => {
      this.scenarios.choppedLight.sampleInBeam = sample;
    });
    this.strainTrimProperty.link((strain) => {
      this.scenarios.bridge.resistanceTrim = LAB_SETTINGS.GAUGE_FACTOR * strain;
    });
    this.capacitanceTrimProperty.link((capacitance) => {
      this.scenarios.bridge.capacitanceTrim = capacitance;
    });
    this.noiseDensityProperty.link((density) => {
      this.noise.whiteDensity = density;
    });
  }

  private randomizeAll(): void {
    this.random.setSeed(this.seed);
    for (const scenario of Object.values(this.scenarios)) {
      scenario.randomize(this.random);
    }
  }

  /** Start acquisition of the selected experiment with an empty history. */
  public selectScenario(key: ScenarioKey): void {
    this.scenarioProperty.value = key;
  }

  /** Start a different unknown for the selected experiment using the Lab's seeded stream. */
  public randomizeScenario(): void {
    this.activeScenario.randomize(this.random);
    this.rowsProperty.reset();
    this.resetAcquisition();
  }

  public autoRange(): void {
    if (!this.referenceUnlockProperty.value) {
      const output = Math.abs(this.demodulator.x);
      this.sensitivityProperty.value = settings.SENSITIVITIES.find((scale) => scale >= output) ?? 1;
    }
  }

  public autoPhase(): void {
    if (!this.referenceUnlockProperty.value) {
      const phase = this.phaseProperty.value + this.demodulator.autoPhase();
      this.phaseProperty.value = Math.atan2(Math.sin(phase), Math.cos(phase));
    }
  }

  public record(): void {
    if (
      this.referenceUnlockProperty.value ||
      this.clock.timeProperty.value === 0 ||
      this.rowsProperty.value.length >= settings.MAX_ROWS
    ) {
      return;
    }
    const { x, y, r, theta } = this.demodulator;
    const reading = {
      frequency: this.reference.frequencyHz,
      phase: this.reference.phase,
      harmonic: this.reference.harmonic,
      x,
      y,
      r,
      theta,
      clipped: this.inputOverloadProperty.value,
    };
    const scenario = this.scenarioProperty.value;
    let row: LabRow;
    if (scenario === "choppedLight") {
      row = { ...reading, scenario, sample: this.sampleProperty.value };
    } else if (scenario === "bridge") {
      row = {
        ...reading,
        scenario,
        strainTrim: this.strainTrimProperty.value,
        capacitanceTrim: this.capacitanceTrimProperty.value,
      };
    } else {
      row = { ...reading, scenario };
    }
    this.rowsProperty.value = [...this.rowsProperty.value, row];
  }

  public deleteRow(index: number): void {
    this.rowsProperty.value = this.rowsProperty.value.filter((_, rowIndex) => rowIndex !== index);
  }

  private beginRelock(): void {
    this.lockUntil = this.clock.timeProperty.value + settings.LOCK_HOLD;
    this.referenceUnlockProperty.value = true;
    this.demodulator.reset();
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

  /** Restore the instrument, seeded unknowns and notebook to their starting state. */
  public reset(): void {
    this.timer.reset();
    this.scenarioProperty.reset();
    for (const property of this.controls) {
      property.reset();
    }
    this.noise.whiteDensity = LAB_SETTINGS.INPUT_NOISE_DENSITY;
    this.noise.driftRate = LAB_SETTINGS.DRIFT_RATE;
    this.noise.pinkCorner = NOISE_SETTINGS.PINK_CORNERS.OFF;
    this.noise.mainsAmplitude = 0;
    this.randomizeAll();
    this.reference.lockedProperty.reset();
    this.savedNotebooks.clear();
    this.rowsProperty.reset();
    this.resetAcquisition();
  }

  private resetAcquisition(): void {
    this.timer.timeProperty.reset();
    this.clock.reset();
    this.scenarios.choppedLight.chopper.reset();
    const external = this.reference.lockedProperty.value;
    this.reference.resetCarrier();
    this.reference.lockedProperty.value = this.externalAvailableProperty.value && external;
    this.lastExternalFrequency = this.scenarios.choppedLight.chopFrequency;
    this.wasExternal = this.reference.lockedProperty.value;
    this.referenceUnlockProperty.value = false;
    this.inputOverloadProperty.value = false;
    this.lockUntil = 0;
    this.overloadUntil = 0;
    this.chopperAngle = 0;
    this.noise.driftRate = this.scenarioProperty.value === "bridge" ? 0 : LAB_SETTINGS.DRIFT_RATE;
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
    const external = this.reference.lockedProperty.value;
    const chopFrequency = this.scenarios.choppedLight.chopFrequency;
    if (external && (!this.wasExternal || chopFrequency !== this.lastExternalFrequency)) {
      this.beginRelock();
    }
    this.wasExternal = external;
    this.lastExternalFrequency = chopFrequency;
    const due = this.clock.samplesDue(this.timer.scaledDt(dt));
    if (due === 0) {
      return;
    }
    const endTime = this.clock.timeProperty.value;
    const sampleDt = this.clock.dt;
    const lastSample = roundSymmetric(endTime * SAMPLING_SETTINGS.SAMPLE_RATE);
    this.scenarios.choppedLight.mainsFrequency = this.noise.mainsFrequency;
    const range = this.inputRangeProperty.value;
    let overloaded = false;
    for (let sample = lastSample - due; sample < lastSample; sample++) {
      const t = sample * sampleDt;
      const input = this.activeScenario.inputAt(t, this.reference) + this.noise.sample(t);
      const phase = this.reference.carrierPhaseAt(t);
      overloaded ||= Math.abs(input) > range;
      this.demodulator.processSample(
        clamp(input, -range, range),
        this.reference.inPhase(t),
        this.reference.quadrature(t),
      );
      this.scopeInput.push(input);
      this.scopePhase.push(phase);
      const decimated = this.decimator.process(this.demodulator.x);
      if (decimated !== undefined) {
        this.xStatistics.push(decimated);
      }
    }
    if (this.activeScenario === this.scenarios.choppedLight) {
      this.chopperAngle = this.scenarios.choppedLight.chopper.carrierPhaseAt((lastSample - 1) * sampleDt);
    }
    if (overloaded) {
      this.overloadUntil = endTime + settings.OVERLOAD_HOLD;
    }
    this.inputOverloadProperty.value = endTime < this.overloadUntil;
    this.referenceUnlockProperty.value = external && endTime < this.lockUntil;
    this.timer.advance(due * sampleDt);
  }

  /** Release the Properties owned by the Lab and its composed models. */
  public dispose(): void {
    this.unlinkMainsFrequency?.();
    for (const property of this.controls) {
      property.dispose();
    }
    this.scenarioProperty.dispose();
    this.rowsProperty.dispose();
    this.inputOverloadProperty.dispose();
    this.referenceUnlockProperty.dispose();
    this.externalAvailableProperty.dispose();
    this.clock.dispose();
    this.reference.dispose();
    this.timer.dispose();
  }
}
