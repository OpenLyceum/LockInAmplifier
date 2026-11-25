/** Dual quadrature detection with an adjustable output reference frame. */
import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { Random, Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { Decimator } from "../../common/model/Decimator.js";
import { Demodulator } from "../../common/model/Demodulator.js";
import type { FilterOrder } from "../../common/model/LockInMath.js";
import { NoiseSource } from "../../common/model/NoiseSource.js";
import { ReferenceOscillator } from "../../common/model/ReferenceOscillator.js";
import { RingBuffer } from "../../common/model/RingBuffer.js";
import { SampleClock } from "../../common/model/SampleClock.js";
import { SignalSource } from "../../common/model/SignalSource.js";
import { TimeModel } from "../../common/TimeModel.js";
import {
  FILTER_SETTINGS,
  SAMPLING_SETTINGS,
  SIGNAL_NOISE_SETTINGS,
  SOURCE_SETTINGS,
  PHASE_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";

const PhaseMode = { SINGLE: "single", DUAL: "dual" } as const;
type PhaseMode = (typeof PhaseMode)[keyof typeof PhaseMode];
const { SAMPLE_RATE, STRIP_RATE } = SAMPLING_SETTINGS;
const fullTurn = 2 * Math.PI;

function wrapAngle(angle: number): number {
  return ((((angle + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;
}

export class PhaseDetectionModel implements TModel {
  public readonly timer = new TimeModel({ initiallyPlaying: true });
  public readonly amplitudeProperty = new NumberProperty(settings.AMPLITUDE, {
    range: new Range(...settings.AMPLITUDE_RANGE),
  });
  public readonly signalPhaseProperty = new NumberProperty(settings.SIGNAL_PHASE, {
    range: new Range(...settings.PHASE_RANGE),
  });
  public readonly referencePhaseProperty = new NumberProperty(0, { range: new Range(...settings.PHASE_RANGE) });
  public readonly detuneProperty = new NumberProperty(0, { range: new Range(...settings.DETUNE_RANGE) });
  public readonly densityProperty = new NumberProperty(settings.DENSITY, {
    range: new Range(...SIGNAL_NOISE_SETTINGS.DENSITY_RANGE),
  });
  public readonly timeConstantProperty = new NumberProperty(settings.TIME_CONSTANT, {
    validValues: [...FILTER_SETTINGS.TIME_CONSTANTS],
  });
  public readonly orderProperty = new NumberProperty(settings.ORDER, {
    validValues: Object.values(FILTER_SETTINGS.ORDERS),
  });
  public readonly hidePhaseProperty = new BooleanProperty(false);
  public readonly showSignalFrameProperty = new BooleanProperty(false);
  public readonly modeProperty = new Property<PhaseMode>(PhaseMode.DUAL, { validValues: Object.values(PhaseMode) });
  public readonly xProperty = new NumberProperty(0);
  public readonly yProperty = new NumberProperty(0);
  public readonly rProperty = new NumberProperty(0);
  public readonly thetaProperty = new NumberProperty(0);
  public readonly signalFrameAngleProperty = new NumberProperty(settings.SIGNAL_PHASE);
  public readonly xHistory = new RingBuffer(settings.STRIP_SECONDS * STRIP_RATE + 1);
  public readonly yHistory = new RingBuffer(settings.STRIP_SECONDS * STRIP_RATE + 1);
  public readonly rHistory = new RingBuffer(settings.STRIP_SECONDS * STRIP_RATE + 1);
  public readonly xTrail = new RingBuffer(settings.TRAIL_SECONDS * STRIP_RATE);
  public readonly yTrail = new RingBuffer(settings.TRAIL_SECONDS * STRIP_RATE);

  private readonly clock = new SampleClock();
  private readonly source = new SignalSource({ amplitude: settings.AMPLITUDE, phase: settings.SIGNAL_PHASE });
  private readonly reference = new ReferenceOscillator(this.source, { locked: false });
  private readonly noise = new NoiseSource({ whiteDensity: settings.DENSITY });
  private readonly phaseRandom = new Random({ seed: settings.HIDDEN_PHASE_SEED });
  private readonly xDecimator = new Decimator();
  private readonly yDecimator = new Decimator();
  private detector = this.createDetector();
  private sampleIndex = 0;
  private cosReference = 1;
  private sinReference = 0;
  private relativeCarrierAngle = 0;

  public constructor() {
    this.amplitudeProperty.link((amplitude) => {
      this.source.amplitude = amplitude;
    });
    this.signalPhaseProperty.link((phase) => {
      this.source.phase = phase;
      this.publishOutput();
    });
    this.detuneProperty.link((detune) => {
      this.reference.frequency = SOURCE_SETTINGS.DEFAULT_FREQUENCY - detune;
    });
    this.densityProperty.link((density) => {
      this.noise.whiteDensity = density;
    });
    this.timeConstantProperty.lazyLink((tau) => this.detector.setTimeConstant(tau));
    this.orderProperty.lazyLink(() => {
      this.detector = this.createDetector();
    });
    this.referencePhaseProperty.lazyLink((theta) => {
      this.cosReference = Math.cos(theta);
      this.sinReference = Math.sin(theta);
      this.publishOutput();
    });
    this.hidePhaseProperty.lazyLink((hide) => {
      if (hide) {
        this.signalPhaseProperty.value = fullTurn * this.phaseRandom.nextDouble() - Math.PI;
      }
    });
  }

  private createDetector(): Demodulator {
    return new Demodulator({
      timeConstant: this.timeConstantProperty.value,
      order: this.orderProperty.value as FilterOrder,
    });
  }

  // The matching I/Q filters are linear. Rotate their common output frame when θ
  // changes so rephasing preserves R and works immediately, including while paused.
  private publishOutput(): void {
    const x = this.detector.x * this.cosReference + this.detector.y * this.sinReference;
    const y = this.detector.y * this.cosReference - this.detector.x * this.sinReference;
    this.xProperty.value = x;
    this.yProperty.value = y;
    this.rProperty.value = Math.hypot(x, y);
    this.thetaProperty.value = Math.atan2(y, x);
    this.signalFrameAngleProperty.value = wrapAngle(
      this.source.phase + this.relativeCarrierAngle - this.referencePhaseProperty.value,
    );
  }

  public autoPhase(): void {
    this.referencePhaseProperty.value = wrapAngle(this.detector.autoPhase());
  }

  public step(dt: number): void {
    const count = this.clock.samplesDue(this.timer.scaledDt(dt));
    if (count === 0) {
      return;
    }
    for (let i = 0; i < count; i++) {
      const t = ++this.sampleIndex / SAMPLE_RATE;
      const voltage = this.source.valueAt(t) + this.noise.sample(t);
      this.detector.processSample(voltage, this.reference.inPhase(t), this.reference.quadrature(t));
      const baseX = this.xDecimator.process(this.detector.x);
      const baseY = this.yDecimator.process(this.detector.y);
      if (baseX !== undefined && baseY !== undefined) {
        const x = baseX * this.cosReference + baseY * this.sinReference;
        const y = baseY * this.cosReference - baseX * this.sinReference;
        this.xHistory.push(x);
        this.yHistory.push(y);
        this.rHistory.push(Math.hypot(x, y));
        this.xTrail.push(x);
        this.yTrail.push(y);
      }
    }
    this.relativeCarrierAngle = wrapAngle(
      this.relativeCarrierAngle + (fullTurn * this.detuneProperty.value * count) / SAMPLE_RATE,
    );
    this.publishOutput();
    this.timer.advance(count / SAMPLE_RATE);
  }

  public reset(): void {
    this.timer.reset();
    this.clock.reset();
    this.source.reset();
    this.reference.reset();
    this.noise.reset();
    this.phaseRandom.setSeed(settings.HIDDEN_PHASE_SEED);
    this.sampleIndex = 0;
    this.relativeCarrierAngle = 0;
    this.amplitudeProperty.reset();
    this.hidePhaseProperty.reset();
    this.signalPhaseProperty.reset();
    this.referencePhaseProperty.reset();
    this.detuneProperty.reset();
    this.densityProperty.reset();
    this.timeConstantProperty.reset();
    this.orderProperty.reset();
    this.showSignalFrameProperty.reset();
    this.modeProperty.reset();
    this.detector.reset();
    this.xDecimator.reset();
    this.yDecimator.reset();
    this.xHistory.reset();
    this.yHistory.reset();
    this.rHistory.reset();
    this.xTrail.reset();
    this.yTrail.reset();
    this.publishOutput();
  }

  public dispose(): void {
    this.amplitudeProperty.dispose();
    this.signalPhaseProperty.dispose();
    this.referencePhaseProperty.dispose();
    this.detuneProperty.dispose();
    this.densityProperty.dispose();
    this.timeConstantProperty.dispose();
    this.orderProperty.dispose();
    this.hidePhaseProperty.dispose();
    this.showSignalFrameProperty.dispose();
    this.modeProperty.dispose();
    this.xProperty.dispose();
    this.yProperty.dispose();
    this.rProperty.dispose();
    this.thetaProperty.dispose();
    this.signalFrameAngleProperty.dispose();
    this.clock.dispose();
    this.reference.dispose();
    this.timer.dispose();
  }
}
