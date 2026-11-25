import { describe, expect, it } from "vitest";
import { cutoff3dB, settlingTime } from "../../src/common/model/LockInMath.js";
import { LowPassCascade } from "../../src/common/model/LowPassCascade.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";

const { SAMPLE_RATE } = SAMPLING_SETTINGS;
const TAU = 0.01;

describe("discrete low-pass cascade", () => {
  it.each([1, 2, 3, 4] as const)("order %i reaches 99%% at the predicted time", (order) => {
    const filter = new LowPassCascade(TAU, order);
    const expected = settlingTime(TAU, order);
    let samples = 0;
    while (filter.output < 0.99 && samples < 2 * expected * SAMPLE_RATE) {
      filter.process(1);
      samples++;
    }
    expect(Math.abs(samples / (SAMPLE_RATE * expected) - 1)).toBeLessThanOrEqual(0.01);
  });

  it.each([1, 2, 3, 4] as const)("order %i has the predicted amplitude at cutoff", (order) => {
    const filter = new LowPassCascade(TAU, order);
    const frequency = cutoff3dB(TAU, order);
    let max = -Infinity;
    let min = Infinity;
    for (let i = 0; i < SAMPLE_RATE; i++) {
      const value = filter.process(Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE));
      if (i >= SAMPLE_RATE / 2) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: The acceptance brief specifies 0.7071.
    expect(Math.abs((max - min) / 2 - 0.7071)).toBeLessThanOrEqual(0.005);
  });

  it("keeps every section's state across time constant changes", () => {
    const filter = new LowPassCascade(TAU, 4);
    filter.reset(0.5);
    filter.setTimeConstant(0.1);
    expect(filter.output).toBe(0.5);
    expect(filter.process(0.5)).toBe(0.5);
  });
});
