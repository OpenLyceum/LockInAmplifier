/** Photodiode signal from a chopped LED and room lights with twice-line-frequency flicker. */
import type { Random } from "scenerystack/dot";
import { SignalSource } from "../../../common/model/SignalSource.js";
import { LAB_SETTINGS, NOISE_SETTINGS } from "../../../LockInAmplifierConstants.js";
import type { LabScenario } from "./LabScenario.js";

const BeamSample = { NONE: "none", A: "A", B: "B", C: "C" } as const;
type BeamSample = (typeof BeamSample)[keyof typeof BeamSample];

export class ChoppedLightScenario implements LabScenario {
  public readonly id = "chopped-light";
  /** Hidden optical transmission for each material, as a fraction of incident intensity. */
  public readonly hiddenParameters: Record<Exclude<BeamSample, "none">, number> = {
    A: LAB_SETTINGS.INITIAL_TRANSMITTANCE,
    B: LAB_SETTINGS.INITIAL_TRANSMITTANCE,
    C: LAB_SETTINGS.INITIAL_TRANSMITTANCE,
  };

  /** Blade carrier. Its square01 waveform gates the LED, and its frequency drives the reference lock. */
  public readonly chopper = new SignalSource({
    frequency: LAB_SETTINGS.INITIAL_CHOP_FREQUENCY,
    waveform: "square01",
  });

  public sampleInBeam: BeamSample = BeamSample.NONE;
  public ledOn = true;
  public opticalGain: number = LAB_SETTINGS.OPTICAL_GAIN;
  public backgroundIntensity: number = LAB_SETTINGS.BACKGROUND_INTENSITY;
  public ledIntensity: number = LAB_SETTINGS.LED_INTENSITY;
  public mainsFrequency: (typeof NOISE_SETTINGS.MAINS_FREQUENCIES)[keyof typeof NOISE_SETTINGS.MAINS_FREQUENCIES] =
    NOISE_SETTINGS.MAINS_FREQUENCIES.NORTH_AMERICA;

  /** Chopper frequency in Hz, constrained to the blade drive range. */
  public get chopFrequency(): number {
    return this.chopper.frequency;
  }

  public set chopFrequency(frequency: number) {
    const [min, max] = LAB_SETTINGS.CHOP_FREQUENCY_RANGE;
    this.chopper.frequency = Math.max(min, Math.min(max, frequency));
  }

  public inputAt(t: number): number {
    const blade = this.chopper.valueAt(t);
    const transmission = this.sampleInBeam === BeamSample.NONE ? 1 : this.hiddenParameters[this.sampleInBeam];
    const flicker = Math.sin(2 * Math.PI * (2 * this.mainsFrequency) * t);
    const background = this.backgroundIntensity * (1 + LAB_SETTINGS.FLICKER_RATIO * flicker);
    const led = this.ledOn ? transmission * this.ledIntensity * blade : 0;
    return this.opticalGain * (background + led);
  }

  public randomize(random: Random): void {
    this.hiddenParameters.A = random.nextDoubleBetween(...LAB_SETTINGS.TRANSMITTANCE_RANGE);
    this.hiddenParameters.B = random.nextDoubleBetween(...LAB_SETTINGS.TRANSMITTANCE_RANGE);
    this.hiddenParameters.C = random.nextDoubleBetween(...LAB_SETTINGS.TRANSMITTANCE_RANGE);
  }

  public reveal(): Record<string, number> {
    return { ...this.hiddenParameters };
  }
}
