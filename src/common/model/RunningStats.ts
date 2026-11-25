/** Rolling population statistics using Welford addition and removal over a sample ring. */
import { RingBuffer } from "./RingBuffer.js";

export class RunningStats {
  private readonly history: RingBuffer;
  private readonly capacity: number;
  private average = 0;
  private sumSquaredDeviations = 0;

  public constructor(capacity: number) {
    this.history = new RingBuffer(capacity);
    this.capacity = capacity;
  }

  /** Mean of the current window, or zero for an empty window. */
  public get mean(): number {
    return this.average;
  }

  /** Population variance of the current window. */
  public get variance(): number {
    return this.history.length === 0 ? 0 : this.sumSquaredDeviations / this.history.length;
  }

  /** Population standard deviation of the current window. */
  public get standardDeviation(): number {
    return Math.sqrt(this.variance);
  }

  /** Add a sample and remove the oldest sample if the window was full. */
  public push(sample: number): void {
    let count = this.history.length;
    if (count === this.capacity) {
      count--;
      if (count === 0) {
        this.average = 0;
        this.sumSquaredDeviations = 0;
      } else {
        const oldest = this.history.atAge(count);
        const delta = oldest - this.average;
        this.average -= delta / count;
        this.sumSquaredDeviations = Math.max(0, this.sumSquaredDeviations - delta * (oldest - this.average));
      }
    }
    const delta = sample - this.average;
    this.average += delta / (count + 1);
    this.sumSquaredDeviations += delta * (sample - this.average);
    this.history.push(sample);
  }

  /** Copy the current statistics window in chronological order. */
  public copySamples(out: Float64Array): number {
    return this.history.copyLatest(this.history.length, out);
  }

  /** Clear the window and its statistics. */
  public reset(): void {
    this.history.reset();
    this.average = 0;
    this.sumSquaredDeviations = 0;
  }
}
