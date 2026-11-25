/** Reference-driven RC low-pass with an unknown cutoff frequency. */
import type { Random } from "scenerystack/dot";
import type { ReferenceOscillator } from "../../../common/model/ReferenceOscillator.js";
import { LAB_SETTINGS } from "../../../LockInAmplifierConstants.js";
import type { LabScenario } from "./LabScenario.js";

export class RcFilterScenario implements LabScenario {
  public readonly id = "rc-filter";
  /** Hidden half-power frequency in Hz. */
  public readonly hiddenParameters: { cutoffFrequency: number } = { cutoffFrequency: LAB_SETTINGS.INITIAL_RC_CUTOFF };

  /** Excitation in peak volts. */
  public excitationAmplitude: number = LAB_SETTINGS.EXCITATION_AMPLITUDE;

  public inputAt(t: number, ref: ReferenceOscillator): number {
    const ratio = ref.frequencyHz / this.hiddenParameters.cutoffFrequency;
    const phase = ref.carrierPhaseAt(t);

    // H = (1 - j f/f_c) / (1 + (f/f_c)²), using the sine phasor convention.
    return (this.excitationAmplitude * (Math.sin(phase) - ratio * Math.cos(phase))) / (1 + ratio * ratio);
  }

  public randomize(random: Random): void {
    this.hiddenParameters.cutoffFrequency = random.nextDoubleBetween(...LAB_SETTINGS.RC_CUTOFF_RANGE);
  }

  public reveal(): Record<string, number> {
    return { ...this.hiddenParameters };
  }
}
