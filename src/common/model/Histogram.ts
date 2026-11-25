/** Fixed-bin histogram of a rolling sample window, rebuilt on demand. */
import { STATISTICS_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { RunningStats } from "./RunningStats.js";

export class Histogram {
  /** Counts from the bottom of the range to the top. Outliers fall in the end bins. */
  public readonly bins = new Uint32Array(STATISTICS_SETTINGS.HISTOGRAM_BINS);
  private minimum = 0;
  private maximum = 0;

  /** Lower range edge. */
  public get min(): number {
    return this.minimum;
  }

  /** Upper range edge. */
  public get max(): number {
    return this.maximum;
  }

  /** Rebuild from the latest statistics window, centered at the mean with width 8σ. */
  public update(stats: RunningStats, scratch: Float64Array): void {
    this.bins.fill(0);
    const count = stats.copySamples(scratch);
    const span = STATISTICS_SETTINGS.HISTOGRAM_SIGMAS * stats.standardDeviation;
    this.minimum = stats.mean - span;
    this.maximum = stats.mean + span;
    const width = this.maximum - this.minimum;
    const binCount = this.bins.length;
    if (width === 0) {
      this.bins[Math.floor(binCount / 2)] = count;
      return;
    }
    for (let i = 0; i < count; i++) {
      const bin = Math.floor((((scratch[i] as number) - this.minimum) / width) * binCount);
      const index = Math.max(0, Math.min(binCount - 1, bin));
      this.bins[index] = (this.bins[index] as number) + 1;
    }
  }

  /** Clear all counts and range edges. */
  public reset(): void {
    this.bins.fill(0);
    this.minimum = 0;
    this.maximum = 0;
  }
}
