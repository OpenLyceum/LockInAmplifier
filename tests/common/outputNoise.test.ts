import { describe, expect, it } from "vitest";
import { Demodulator } from "../../src/common/model/Demodulator.js";
import { predictedOutputNoise, settlingTime } from "../../src/common/model/LockInMath.js";
import { NoiseSource } from "../../src/common/model/NoiseSource.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";

const { SAMPLE_RATE } = SAMPLING_SETTINGS;
const DURATION = 200;

function measure(amplitude: number, density: number, tau: number, order: 1 | 2 | 4) {
  const noise = new NoiseSource({ seed: 1, whiteDensity: density });
  const demodulator = new Demodulator({ timeConstant: tau, order });
  const warmup = Math.ceil(settlingTime(tau, order, 0.999) * SAMPLE_RATE);
  let mean = 0;
  let squaredDeviations = 0;
  for (let i = -warmup; i < DURATION * SAMPLE_RATE; i++) {
    const t = i / SAMPLE_RATE;
    const sine = Math.sin(2 * Math.PI * 100 * t);
    const cosine = Math.cos(2 * Math.PI * 100 * t);
    demodulator.processSample(amplitude * sine + noise.sample(t), 2 * sine, 2 * cosine);
    if (i >= 0) {
      const delta = demodulator.x - mean;
      mean += delta / (i + 1);
      squaredDeviations += delta * (demodulator.x - mean);
    }
  }
  return { mean, sigma: Math.sqrt(squaredDeviations / (DURATION * SAMPLE_RATE)) };
}

describe("lock-in output noise", () => {
  it.each([
    [0.1, 1, 0.02236],
    [0.1, 4, 0.0125],
    [1, 2, 0.005],
  ] as const)("τ=%f s, order %i agrees with the noise-bandwidth prediction", (tau, order, expected) => {
    const density = 0.01;
    const { mean, sigma } = measure(0, density, tau, order);
    const prediction = predictedOutputNoise(density, tau, order);
    expect(Math.abs(prediction - expected)).toBeLessThanOrEqual(5e-6);
    expect(Math.abs(sigma / prediction - 1)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(mean)).toBeLessThanOrEqual((3 * sigma) / Math.sqrt(DURATION / (2 * tau)));
  });

  it("recovers a 50 mV signal in much larger sample noise", () => {
    const { mean, sigma } = measure(0.05, 0.005, 0.3, 2);
    expect(Math.abs(mean - 0.05)).toBeLessThanOrEqual(0.0015);
    expect(Math.abs(sigma / 0.00456 - 1)).toBeLessThanOrEqual(0.1);
  });
});
