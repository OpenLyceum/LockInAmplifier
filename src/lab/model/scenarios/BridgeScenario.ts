/** AC quarter bridge with a strain-dependent resistance and parallel stray capacitance. */
import { Complex, type Random } from "scenerystack/dot";
import type { ReferenceOscillator } from "../../../common/model/ReferenceOscillator.js";
import { LAB_SETTINGS } from "../../../LockInAmplifierConstants.js";
import type { LabScenario } from "./LabScenario.js";

export class BridgeScenario implements LabScenario {
  public readonly id = "bridge";
  /** Hidden dimensionless strain and stray capacitance in farads. */
  public readonly hiddenParameters: { strain: number; strayCapacitance: number } = {
    strain: LAB_SETTINGS.INITIAL_STRAIN,
    strayCapacitance: LAB_SETTINGS.INITIAL_STRAY_CAPACITANCE,
  };

  /** Nominal resistance of the fixed arms in ohms. */
  public nominalResistance: number = LAB_SETTINGS.BRIDGE_RESISTANCE;
  /** Excitation in peak volts. */
  public excitationAmplitude: number = LAB_SETTINGS.EXCITATION_AMPLITUDE;
  /** Fractional resistance adjustment and capacitance adjustment (F) in the balance arm. */
  public resistanceTrim = 0;
  public capacitanceTrim = 0;

  private readonly one = new Complex(1, 0);
  private readonly denominator = new Complex(0, 0);
  private readonly active = new Complex(0, 0);
  private readonly trim = new Complex(0, 0);

  public inputAt(t: number, ref: ReferenceOscillator): number {
    const { strain, strayCapacitance } = this.hiddenParameters;
    const omegaR = 2 * Math.PI * ref.frequencyHz * this.nominalResistance;

    // Divide both numerator and denominator of Z/(Z+R) by Z. For parallel R(1+δ) and C,
    // the divider is then 1 / (1 + 1/(1+δ) + jωRC). The complex scratch is reused each sample.
    this.denominator.setRealImaginary(1 + 1 / (1 + LAB_SETTINGS.GAUGE_FACTOR * strain), omegaR * strayCapacitance);
    this.active.set(this.one).divide(this.denominator);
    this.denominator.setRealImaginary(1 + 1 / (1 + this.resistanceTrim), omegaR * this.capacitanceTrim);
    this.trim.set(this.one).divide(this.denominator);
    this.active.subtract(this.trim);

    const phase = ref.carrierPhaseAt(t);
    return this.excitationAmplitude * (this.active.real * Math.sin(phase) + this.active.imaginary * Math.cos(phase));
  }

  public randomize(random: Random): void {
    this.hiddenParameters.strain = random.nextDoubleBetween(...LAB_SETTINGS.STRAIN_RANGE);
    this.hiddenParameters.strayCapacitance = random.nextDoubleBetween(...LAB_SETTINGS.STRAY_CAPACITANCE_RANGE);
  }

  public reveal(): Record<string, number> {
    return { ...this.hiddenParameters, resistanceChange: LAB_SETTINGS.GAUGE_FACTOR * this.hiddenParameters.strain };
  }
}
