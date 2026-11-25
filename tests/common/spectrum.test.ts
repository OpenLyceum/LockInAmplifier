import { describe, expect, it } from "vitest";
import {
  averagedPowerSpectrum,
  computeMagnitudeSpectrum,
  createSpectrumScratch,
} from "../../src/common/model/Spectrum.js";

describe("FFT spectrum", () => {
  it("reports calibrated peak amplitude and the Hann resolution bandwidth", () => {
    const length = 2 ** 13;
    const bin = 197;
    const input = Float64Array.from({ length }, (_, i) => 0.7 * Math.sin((2 * Math.PI * bin * i) / length));
    const scratch = createSpectrumScratch(length);
    const spectrum = computeMagnitudeSpectrum(input, scratch);
    expect(Math.abs((spectrum[bin] as number) / 0.7 - 1)).toBeLessThanOrEqual(0.005);
    expect(scratch.rbw).toBe(3.75);
  });

  it("averages squared amplitudes independently of phase and reuses scratch", () => {
    const length = 2 ** 11;
    const bin = 91;
    const frames = [1, -1, 0.5, -0.5].map((amplitude) =>
      Float64Array.from({ length }, (_, i) => amplitude * Math.sin((2 * Math.PI * bin * i) / length)),
    );
    const scratch = createSpectrumScratch(length);
    const result = averagedPowerSpectrum(frames, scratch);
    expect(result).toBe(scratch.power);
    expect(result[bin]).toBeCloseTo((1 + 1 + 0.25 + 0.25) / 4, 12);
  });

  it("runs a 2048-point FFT in under 2 ms at the median", () => {
    const length = 2 ** 11;
    const input = Float64Array.from({ length }, (_, i) => Math.sin(i));
    const scratch = createSpectrumScratch(length);
    const times = Array.from({ length: 50 }, () => {
      const start = performance.now();
      computeMagnitudeSpectrum(input, scratch);
      return performance.now() - start;
    });
    times.sort((a, b) => a - b);
    expect(((times[24] as number) + (times[25] as number)) / 2).toBeLessThan(2);
  });
});
