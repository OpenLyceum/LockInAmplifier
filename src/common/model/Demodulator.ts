/** Mixes each input sample to baseband and filters the two quadratures independently. */
import { optionize } from "scenerystack/phet-core";
import { FILTER_SETTINGS } from "../../LockInAmplifierConstants.js";
import { cutoff3dB, enbw, type FilterOrder, magnitude, predictedOutputNoise, settlingTime } from "./LockInMath.js";
import { LowPassCascade } from "./LowPassCascade.js";

type DemodulatorOptions = {
  timeConstant?: number;
  order?: FilterOrder;
  phaseOnly?: boolean;
};

export class Demodulator {
  /** When true, bypass the Q mixer and filter. */
  public readonly phaseOnly: boolean;

  private readonly inPhaseFilter: LowPassCascade;
  private readonly quadratureFilter: LowPassCascade | null;
  private readonly order: FilterOrder;
  private timeConstant: number;
  private mixedInPhase = 0;

  public constructor(providedOptions?: DemodulatorOptions) {
    const options = optionize<DemodulatorOptions>()(
      {
        timeConstant: FILTER_SETTINGS.DEFAULT_TIME_CONSTANT,
        order: FILTER_SETTINGS.ORDERS.FOURTH,
        phaseOnly: false,
      },
      providedOptions,
    );
    this.phaseOnly = options.phaseOnly;
    this.order = options.order;
    this.timeConstant = options.timeConstant;
    this.inPhaseFilter = new LowPassCascade(options.timeConstant, options.order);
    this.quadratureFilter = this.phaseOnly ? null : new LowPassCascade(options.timeConstant, options.order);
  }

  /** Filtered in-phase voltage. */
  public get x(): number {
    return this.inPhaseFilter.output;
  }

  /** Filtered quadrature voltage, zero in single-phase mode. */
  public get y(): number {
    return this.quadratureFilter?.output ?? 0;
  }

  /** Filtered phasor magnitude, in volts. */
  public get r(): number {
    return Math.hypot(this.x, this.y);
  }

  /** Filtered phasor angle, in radians. */
  public get theta(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Most recent unfiltered mixer output for the in-phase channel. */
  public get xMix(): number {
    return this.mixedInPhase;
  }

  /** Advance each active channel by one sample. */
  public processSample(voltage: number, refI: number, refQ: number): void {
    this.mixedInPhase = voltage * refI;
    this.inPhaseFilter.process(this.mixedInPhase);
    this.quadratureFilter?.process(voltage * refQ);
  }

  /** Return the phase correction in radians to add to the reference phase. */
  public autoPhase(): number {
    return this.theta;
  }

  /** Set both time constants without changing the stored filter outputs. */
  public setTimeConstant(timeConstant: number): void {
    this.inPhaseFilter.setTimeConstant(timeConstant);
    this.quadratureFilter?.setTimeConstant(timeConstant);
    this.timeConstant = timeConstant;
  }

  /** Continuous-time predictions for the active filter and input noise density. */
  public filterResponse(
    frequency: number,
    whiteDensity: number,
  ): {
    enbw: number;
    cutoff3dB: number;
    magnitude: number;
    settlingTime: number;
    outputNoise: number;
  } {
    const tau = this.timeConstant;
    return {
      enbw: enbw(tau, this.order),
      cutoff3dB: cutoff3dB(tau, this.order),
      magnitude: magnitude(frequency, tau, this.order),
      settlingTime: settlingTime(tau, this.order),
      outputNoise: predictedOutputNoise(whiteDensity, tau, this.order),
    };
  }

  /** Clear both channel histories. */
  public reset(): void {
    this.inPhaseFilter.reset();
    this.quadratureFilter?.reset();
    this.mixedInPhase = 0;
  }
}
