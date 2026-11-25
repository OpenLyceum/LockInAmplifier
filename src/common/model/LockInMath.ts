/** Continuous-time bandwidth, magnitude and settling predictions for identical low-pass sections. */
import { FILTER_SETTINGS } from "../../LockInAmplifierConstants.js";

export type FilterOrder = (typeof FILTER_SETTINGS.ORDERS)[keyof typeof FILTER_SETTINGS.ORDERS];
const ENBW_FACTORS = { 1: 1 / 4, 2: 1 / 8, 3: 3 / 32, 4: 5 / 64 } as const;

/** One-sided equivalent noise bandwidth in Hz for a time constant in seconds. */
export function enbw(timeConstant: number, order: FilterOrder): number {
  return ENBW_FACTORS[order] / timeConstant;
}

/** Half-power frequency in Hz. */
export function cutoff3dB(timeConstant: number, order: FilterOrder): number {
  return Math.sqrt(2 ** (1 / order) - 1) / (2 * Math.PI * timeConstant);
}

/** Amplitude transfer at frequency in Hz. */
export function magnitude(frequency: number, timeConstant: number, order: FilterOrder): number {
  return (1 + (2 * Math.PI * frequency * timeConstant) ** 2) ** (-order / 2);
}

/** Time in seconds for a unit step to reach the given fraction of its final value. */
export function settlingTime(
  timeConstant: number,
  order: FilterOrder,
  fraction: number = FILTER_SETTINGS.SETTLING_FRACTION,
): number {
  if (fraction < 0 || fraction > 1 || !Number.isFinite(fraction)) {
    throw new RangeError("Settling fraction must lie in [0, 1]");
  }
  if (fraction === 0 || fraction === 1) {
    return fraction === 0 ? 0 : Infinity;
  }

  const targetTail = 1 - fraction;
  let low = 0;
  let high = 1;
  while (stepTail(high, order) > targetTail) {
    high *= 2;
  }
  for (let i = 0; i < FILTER_SETTINGS.BISECTION_ITERATIONS; i++) {
    const middle = (low + high) / 2;
    if (stepTail(middle, order) > targetTail) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return ((low + high) / 2) * timeConstant;
}

/** Remaining step error exp(-x) times the finite exponential series through order - 1. */
function stepTail(x: number, order: FilterOrder): number {
  let term = 1;
  let sum = term;
  for (let k = 1; k < order; k++) {
    term *= x / k;
    sum += term;
  }
  return Math.exp(-x) * sum;
}

/**
 * RMS noise voltage after mixing and filtering. Multiplying by 2 sin shifts two copies of the
 * white spectrum to baseband. Each shift has unit gain, so the one-sided PSD near DC doubles.
 * Integrating this PSD over the filter ENBW gives 2 e_n² ENBW.
 */
export function predictedOutputNoise(density: number, timeConstant: number, order: FilterOrder): number {
  return Math.SQRT2 * density * Math.sqrt(enbw(timeConstant, order));
}
