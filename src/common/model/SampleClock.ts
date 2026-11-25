/** Fixed-rate sample scheduling for a variable animation step. */
import { NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";

export class SampleClock {
  /** Duration of one sample interval in seconds. */
  public readonly dt = 1 / SAMPLING_SETTINGS.SAMPLE_RATE;

  private readonly elapsedTimeProperty = new NumberProperty(0, { units: "s" });
  private samplesProduced = 0;
  private fractionalSamples = 0;

  /** End time of the most recently scheduled batch, in seconds. */
  public get timeProperty(): TReadOnlyProperty<number> {
    return this.elapsedTimeProperty;
  }

  /** Carry partial samples across steps and permanently drop time beyond the per-step cap. */
  public samplesDue(dtSeconds: number, maxStepSeconds: number = SAMPLING_SETTINGS.MAX_STEP_SECONDS): number {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
      return 0;
    }
    const budget = this.fractionalSamples + Math.min(dtSeconds, maxStepSeconds) * SAMPLING_SETTINGS.SAMPLE_RATE;
    // Frame-time arithmetic can leave a whole-sample boundary a few ulps short.
    const due = Math.floor(budget + 2 * Number.EPSILON * budget);
    this.fractionalSamples = Math.max(0, budget - due);
    this.samplesProduced += due;
    this.elapsedTimeProperty.value = this.samplesProduced / SAMPLING_SETTINGS.SAMPLE_RATE;
    return due;
  }

  /** Reset both elapsed time and the partial sample budget. */
  public reset(): void {
    this.samplesProduced = 0;
    this.fractionalSamples = 0;
    this.elapsedTimeProperty.reset();
  }

  /** Release the owned time Property. */
  public dispose(): void {
    this.elapsedTimeProperty.dispose();
  }
}
