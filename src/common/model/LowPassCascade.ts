/** Cascaded first-order low-pass sections with a fixed input sample period. */
import { SAMPLING_SETTINGS } from "../../LockInAmplifierConstants.js";
import type { FilterOrder } from "./LockInMath.js";

export class LowPassCascade {
  private readonly sections: Float64Array;
  private alpha = 0;

  public constructor(timeConstant: number, order: FilterOrder) {
    this.sections = new Float64Array(order);
    this.setTimeConstant(timeConstant);
  }

  /** Last output sample, in the same units as the input. */
  public get output(): number {
    return this.sections[this.sections.length - 1] as number;
  }

  /** Advance each section by one sample. */
  public process(input: number): number {
    let value = input;
    for (let i = 0; i < this.sections.length; i++) {
      const previous = this.sections[i] as number;
      value = previous + this.alpha * (value - previous);
      this.sections[i] = value;
    }
    return value;
  }

  /** Set every section output to its initial value. */
  public reset(value = 0): void {
    this.sections.fill(value);
  }

  /** Recompute the section coefficient without modifying its stored output. */
  public setTimeConstant(timeConstant: number): void {
    if (!Number.isFinite(timeConstant) || timeConstant <= 0) {
      throw new RangeError("Time constant must be finite and positive");
    }
    this.alpha = -Math.expm1(-1 / (SAMPLING_SETTINGS.SAMPLE_RATE * timeConstant));
  }
}
