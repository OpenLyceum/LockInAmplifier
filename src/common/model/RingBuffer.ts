/** Fixed-capacity Float64 sample history with chronological readout. */
export class RingBuffer {
  private readonly samples: Float64Array;
  private next = 0;
  private count = 0;

  public constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError("Ring capacity must be a positive integer");
    }
    this.samples = new Float64Array(capacity);
  }

  /** Number of valid samples in the history. */
  public get length(): number {
    return this.count;
  }

  /** Append a sample, overwriting the oldest if full. */
  public push(value: number): void {
    this.samples[this.next] = value;
    this.next = (this.next + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
  }

  /** Read an existing sample by age, with zero denoting the newest. */
  public atAge(age: number): number {
    if (age < 0 || age >= this.count || !Number.isInteger(age)) {
      throw new RangeError("Sample age is outside the ring history");
    }
    return this.samples[(this.next - 1 - age + this.samples.length) % this.samples.length] as number;
  }

  /** Copy up to n newest samples into out in chronological order. Returns the count written. */
  public copyLatest(n: number, out: Float64Array): number {
    const count = Math.min(n, this.count, out.length);
    return this.copyFromAge(count - 1, count, out);
  }

  /**
   * Find the newest falling phase wrap with a complete n-sample record following it.
   * Align the latest entries in both histories. Fall back to the latest samples if no wrap qualifies.
   */
  public copyTriggered(n: number, out: Float64Array, refPhaseBuffer: RingBuffer): number {
    const count = Math.min(n, this.count, out.length);
    const oldestAge = Math.min(this.count, refPhaseBuffer.length) - 1;
    for (let age = count - 1; count > 0 && age < oldestAge; age++) {
      if (refPhaseBuffer.atAge(age) < refPhaseBuffer.atAge(age + 1)) {
        return this.copyFromAge(age, count, out);
      }
    }
    return this.copyLatest(n, out);
  }

  /** Clear the valid history. */
  public reset(): void {
    this.next = 0;
    this.count = 0;
  }

  private copyFromAge(age: number, count: number, out: Float64Array): number {
    for (let i = 0; i < count; i++) {
      out[i] = this.atAge(age - i);
    }
    return count;
  }
}
