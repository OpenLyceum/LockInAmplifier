import { describe, expect, it } from "vitest";
import { cutoff3dB, enbw, magnitude, settlingTime } from "../../src/common/model/LockInMath.js";
import { FILTER_SETTINGS } from "../../src/LockInAmplifierConstants.js";

describe("lock-in filter predictions", () => {
  it.each([
    [1, 2.5, 1.5915, 4.605],
    [2, 1.25, 1.0243, 6.638],
    [3, 0.9375, 0.8114, 8.406],
    [4, 0.78125, 0.6923, 10.045],
  ] as const)("order %i has the expected bandwidth, cutoff and settling time", (order, bandwidth, cutoff, settling) => {
    const tau = 0.1;
    expect(Math.abs(enbw(tau, order) / bandwidth - 1)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(cutoff3dB(tau, order) - cutoff)).toBeLessThanOrEqual(1e-4);
    expect(Math.abs(settlingTime(tau, order) / tau - settling)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(magnitude(cutoff3dB(tau, order), tau, order) - Math.SQRT1_2)).toBeLessThanOrEqual(1e-9);
  });

  it("uses the expected time-constant detents in seconds", () => {
    expect(FILTER_SETTINGS.TIME_CONSTANTS).toEqual([0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10]);
  });
});
