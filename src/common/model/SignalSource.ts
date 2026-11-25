/** Analytic waveforms with a continuous carrier phase through frequency edits. */
import { optionize } from "scenerystack/phet-core";
import { SOURCE_SETTINGS } from "../../LockInAmplifierConstants.js";

const SignalWaveform = { SINE: "sine", SQUARE_01: "square01" } as const;
type SignalWaveform = (typeof SignalWaveform)[keyof typeof SignalWaveform];

type SignalSourceOptions = {
  amplitude?: number;
  frequency?: number;
  phase?: number;
  waveform?: SignalWaveform;
  dcOffset?: number;
};

const FULL_TURN = 2 * Math.PI;

export class SignalSource {
  /** Peak sine amplitude or square wave height, in volts. */
  public amplitude: number;
  /** Frequency in Hz, effective from the last evaluated timestamp. */
  public frequency: number;
  /** Phase offset in radians. */
  public phase: number;
  /** Sine or 50% duty cycle unipolar square. */
  public waveform: SignalWaveform;
  /** DC offset in volts. */
  public dcOffset: number;

  private carrierPhase = 0;
  private lastTime = 0;

  public constructor(providedOptions?: SignalSourceOptions) {
    const options = optionize<SignalSourceOptions>()(
      {
        amplitude: SOURCE_SETTINGS.DEFAULT_AMPLITUDE,
        frequency: SOURCE_SETTINGS.DEFAULT_FREQUENCY,
        phase: 0,
        waveform: SignalWaveform.SINE,
        dcOffset: 0,
      },
      providedOptions,
    );
    this.amplitude = options.amplitude;
    this.frequency = options.frequency;
    this.phase = options.phase;
    this.waveform = options.waveform;
    this.dcOffset = options.dcOffset;
  }

  /** Evaluate the carrier at t seconds. Call chronologically when changing frequency. */
  public carrierPhaseAt(t: number, frequency = this.frequency): number {
    this.carrierPhase = (this.carrierPhase + FULL_TURN * frequency * (t - this.lastTime)) % FULL_TURN;
    this.lastTime = t;
    return this.carrierPhase < 0 ? this.carrierPhase + FULL_TURN : this.carrierPhase;
  }

  /** Evaluate the analytic waveform at t seconds. */
  public valueAt(t: number): number {
    const phase = (this.carrierPhaseAt(t) + this.phase) % FULL_TURN;
    const value =
      this.waveform === SignalWaveform.SINE
        ? Math.sin(phase)
        : Number((phase < 0 ? phase + FULL_TURN : phase) < Math.PI);
    return this.dcOffset + this.amplitude * value;
  }

  /** Rewind the carrier to the specified time with phase zero. */
  public reset(t = 0): void {
    this.lastTime = t;
    this.carrierPhase = 0;
  }
}
