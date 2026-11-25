/** Reduces the fixed sample rate to the strip-chart rate using non-overlapping block averages. */
import { SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";

const BLOCK_SIZE = SAMPLING_SETTINGS.SAMPLE_RATE / SAMPLING_SETTINGS.STRIP_RATE;

export class Decimator {
  private sum = 0;
  private count = 0;

  /** Return the averaged value when a block completes, or undefined while it is still filling. */
  public process(sample: number): number | undefined {
    this.sum += sample;
    this.count++;
    if (this.count < BLOCK_SIZE) {
      return undefined;
    }
    const average = this.sum / BLOCK_SIZE;
    this.reset();
    return average;
  }

  /** Discard the current partial block. */
  public reset(): void {
    this.sum = 0;
    this.count = 0;
  }
}
