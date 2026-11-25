import { describe, expect, it } from "vitest";
import { NoiseSource } from "../../src/common/model/NoiseSource.js";
import {
  averagedPowerSpectrum,
  computeMagnitudeSpectrum,
  createSpectrumScratch,
} from "../../src/common/model/Spectrum.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";

const { SAMPLE_RATE } = SAMPLING_SETTINGS;
const DENSITY = 0.01;

describe("input noise", () => {
  it("converts one-sided white density to the expected sample RMS", () => {
    const source = new NoiseSource({ seed: 1, whiteDensity: DENSITY });
    let mean = 0;
    let squaredDeviations = 0;
    const count = 200 * SAMPLE_RATE;
    for (let i = 0; i < count; i++) {
      const value = source.sample(i / SAMPLE_RATE);
      const delta = value - mean;
      mean += delta / (i + 1);
      squaredDeviations += delta * (value - mean);
    }
    const sigma = Math.sqrt(squaredDeviations / count);
    expect(Math.abs(sigma / (DENSITY * Math.sqrt(10240)) - 1)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(sigma / 1.012 - 1)).toBeLessThanOrEqual(0.01);
  });

  it("measures the white Hann-window floor from 64 records", () => {
    const length = 2 ** 13;
    const source = new NoiseSource({ seed: 1, whiteDensity: DENSITY });
    let index = 0;
    const frames = Array.from({ length: 64 }, () =>
      Float64Array.from({ length }, () => source.sample(index++ / SAMPLE_RATE)),
    );
    const spectrum = averagedPowerSpectrum(frames, createSpectrumScratch(length));
    const bins = spectrum.subarray(10, length / 2 - 10 + 1);
    const rms = Math.sqrt(bins.reduce((sum, power) => sum + power, 0) / bins.length);
    const expected = DENSITY * Math.sqrt(10240) * Math.sqrt(6 / length);
    expect(Math.abs(rms / expected - 1)).toBeLessThanOrEqual(0.05);
  });

  it("adds pink noise with a near 1/f PSD and approaches white at 1 kHz", () => {
    const length = 2 ** 15;
    const source = new NoiseSource({ seed: 1, whiteDensity: DENSITY, pinkCorner: 100 });
    const scratch = createSpectrumScratch(length);
    const frame = new Float64Array(length);
    const whiteFloor = DENSITY ** 2 * scratch.rbw * 2;
    const recordCount = (200 * SAMPLE_RATE) / length;
    const meanPower = new Float64Array(scratch.power.length);
    for (let record = 0; record < recordCount; record++) {
      for (let i = 0; i < length; i++) {
        frame[i] = source.sample((record * length + i) / SAMPLE_RATE);
      }
      const power = averagedPowerSpectrum([frame], scratch);
      for (let k = 0; k < power.length; k++) {
        meanPower[k] = (meanPower[k] as number) + (power[k] as number) / recordCount;
      }
    }

    // Remove the known white floor and average the pink PSD in log-spaced bands
    // before fitting, so noisy individual bins cannot dominate the logarithm near 200 Hz.
    const bandCount = 16;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let usedBands = 0;
    for (let band = 0; band < bandCount; band++) {
      const low = 2 * 100 ** (band / bandCount);
      const high = 2 * 100 ** ((band + 1) / bandCount);
      let sum = 0;
      let logFrequency = 0;
      let count = 0;
      for (let bin = Math.ceil((low * length) / SAMPLE_RATE); bin < (high * length) / SAMPLE_RATE; bin++) {
        sum += (meanPower[bin] as number) - whiteFloor;
        logFrequency += Math.log((bin * SAMPLE_RATE) / length);
        count++;
      }
      if (count > 0) {
        const x = logFrequency / count;
        const y = Math.log(sum / count);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
        usedBands++;
      }
    }
    const slope = (usedBands * sumXY - sumX * sumY) / (usedBands * sumXX - sumX * sumX);
    expect(Math.abs(slope - -1.0)).toBeLessThanOrEqual(0.15);

    const centerBin = (1000 * length) / SAMPLE_RATE;
    const nearby = meanPower.subarray(centerBin - 8, centerBin + 9);
    const localPower = nearby.reduce((sum, power) => sum + power, 0) / nearby.length;
    expect(Math.abs(localPower / whiteFloor - 1)).toBeLessThanOrEqual(0.2);
  }, 15000);

  it("produces the 60 Hz mains fundamental and 180 Hz third harmonic", () => {
    const length = 2 ** 13;
    const amplitude = 0.4;
    const source = new NoiseSource({ mainsAmplitude: amplitude });
    const frame = Float64Array.from({ length }, (_, i) => source.sample(i / SAMPLE_RATE));
    const bins = computeMagnitudeSpectrum(frame, createSpectrumScratch(length));
    expect(Math.abs((bins[(60 * length) / SAMPLE_RATE] as number) / amplitude - 1)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((bins[(180 * length) / SAMPLE_RATE] as number) / (0.3 * amplitude) - 1)).toBeLessThanOrEqual(0.02);
  });

  it("replays identical samples from the same seed even when sources are interleaved", () => {
    const options = { seed: 1, whiteDensity: DENSITY, pinkCorner: 100, driftRate: 0.01 } as const;
    const a = new NoiseSource(options);
    const b = new NoiseSource(options);
    const expected: number[] = [];
    for (let i = 0; i < 101; i++) {
      const t = i / SAMPLE_RATE;
      const sample = a.sample(t);
      expected.push(sample);
      expect(b.sample(t)).toBe(sample);
    }
    b.reset();
    for (const [i, value] of expected.entries()) {
      expect(b.sample(i / SAMPLE_RATE)).toBe(value);
    }
  });
});
