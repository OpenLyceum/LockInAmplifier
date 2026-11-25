/** Generates normalized I/Q mixer waveforms from one continuous carrier. */
import { BooleanProperty } from "scenerystack/axon";
import { optionize } from "scenerystack/phet-core";
import { SOURCE_SETTINGS } from "../../LockInAmplifierConstants.js";
import { SignalSource } from "./SignalSource.js";

const ReferenceWaveform = { SINE: "sine", SQUARE: "square" } as const;
type ReferenceWaveform = (typeof ReferenceWaveform)[keyof typeof ReferenceWaveform];

const Harmonic = { FUNDAMENTAL: 1, SECOND: 2, THIRD: 3 } as const;
type Harmonic = (typeof Harmonic)[keyof typeof Harmonic];

type ReferenceOptions = {
  frequency?: number;
  locked?: boolean;
  followSignalPhase?: boolean;
  phase?: number;
  waveform?: ReferenceWaveform;
  harmonic?: Harmonic;
};

export class ReferenceOscillator {
  /** Selects the signal frequency in place of the independent reference frequency. */
  public readonly lockedProperty: BooleanProperty;
  /** Independent reference frequency in Hz. */
  public frequency: number;
  /** Detector phase adjustment in radians, applied after harmonic multiplication. */
  public phase: number;
  /** Mixer reference waveform. */
  public waveform: ReferenceWaveform;
  /** Harmonic of the fundamental used by the mixer. */
  public harmonic: Harmonic;

  private readonly followSignalPhase: boolean;
  private readonly carrier = new SignalSource();
  private readonly signal: SignalSource;

  public constructor(signal: SignalSource, providedOptions?: ReferenceOptions) {
    const options = optionize<ReferenceOptions>()(
      {
        frequency: SOURCE_SETTINGS.DEFAULT_FREQUENCY,
        locked: true,
        followSignalPhase: false,
        phase: 0,
        waveform: ReferenceWaveform.SINE,
        harmonic: Harmonic.FUNDAMENTAL,
      },
      providedOptions,
    );
    this.signal = signal;
    this.followSignalPhase = options.followSignalPhase;
    this.frequency = options.frequency;
    this.lockedProperty = new BooleanProperty(options.locked);
    this.phase = options.phase;
    this.waveform = options.waveform;
    this.harmonic = options.harmonic;
  }

  /** Fundamental frequency in Hz, including the lock selection. */
  public get frequencyHz(): number {
    return this.lockedProperty.value ? this.signal.frequency : this.frequency;
  }

  /** Unshifted fundamental phase in [0, 2π), also used by the Lab excitation and scope trigger. */
  public carrierPhaseAt(t: number): number {
    return this.followSignalPhase && this.lockedProperty.value
      ? this.signal.carrierPhaseAt(t)
      : this.carrier.carrierPhaseAt(t, this.frequencyHz);
  }

  /** In-phase input to the mixer. */
  public inPhase(t: number): number {
    return this.normalize(Math.sin(this.harmonic * this.carrierPhaseAt(t) + this.phase));
  }

  /** Quadrature input to the mixer. May be evaluated at the same time as I. */
  public quadrature(t: number): number {
    return this.normalize(Math.cos(this.harmonic * this.carrierPhaseAt(t) + this.phase));
  }

  /** Scale either reference so its fundamental has peak amplitude two. */
  private normalize(value: number): number {
    return this.waveform === ReferenceWaveform.SINE ? 2 * value : (Math.PI / 2) * Math.sign(value);
  }

  /** Restore the lock selection and rewind the carrier. */
  public reset(): void {
    this.lockedProperty.reset();
    this.resetCarrier();
  }

  /** Rewind the carrier while keeping the current reference source. */
  public resetCarrier(): void {
    this.carrier.reset();
  }

  /** Release the owned lock Property. */
  public dispose(): void {
    this.lockedProperty.dispose();
  }
}
