import { describe, expect, it } from "vitest";
import { MIXING_SETTINGS } from "../../src/LockInAmplifierConstants.js";
import { MixingModel } from "../../src/mixing/model/MixingModel.js";

describe("MixingModel", () => {
  it("measures A cos θ to within 1% with the reference locked", () => {
    const model = new MixingModel();
    for (const phase of [0, Math.PI / 3, Math.PI / 2]) {
      model.phaseProperty.value = phase;
      for (let quarter = 0; quarter < 4; quarter++) {
        model.step(0.25);
      }
      const expected = model.amplitudeProperty.value * Math.cos(phase);
      expect(Math.abs(model.productMean - expected)).toBeLessThanOrEqual(
        0.01 * (Math.abs(expected) || model.amplitudeProperty.value) + 1e-12,
      );
    }
    model.dispose();
  });

  it("shows one-third third-harmonic gain with a square reference and restores defaults on reset", () => {
    const model = new MixingModel();
    model.thirdHarmonicProperty.value = true;
    for (let quarter = 0; quarter < 4; quarter++) {
      model.step(0.25);
    }
    expect(model.productMean).toBeCloseTo(MIXING_SETTINGS.AMPLITUDE, 3);
    model.waveformProperty.value = "square";
    for (let quarter = 0; quarter < 4; quarter++) {
      model.step(0.25);
    }
    const expected = MIXING_SETTINGS.AMPLITUDE * (1 + 1 / 3);
    expect(Math.abs(model.productMean - expected)).toBeLessThan(0.01 * expected);

    model.lockedProperty.value = false;
    model.referenceFrequencyProperty.value += 1;
    model.orderProperty.value = 4;
    model.timeConstantProperty.value = 0.3;
    model.reset();
    expect(model.lockedProperty.value).toBe(true);
    expect(model.referenceFrequencyProperty.value).toBe(MIXING_SETTINGS.FREQUENCY);
    expect(model.waveformProperty.value).toBe("sine");
    expect(model.thirdHarmonicProperty.value).toBe(false);
    expect(model.orderProperty.value).toBe(MIXING_SETTINGS.ORDER);
    expect(model.timeConstantProperty.value).toBe(MIXING_SETTINGS.TIME_CONSTANT);
    expect(model.outputHistory.length).toBe(0);
    expect(model.traces.product.length).toBe(0);
    expect(model.outputProperty.value).toBe(0);
    expect(model.productMean).toBe(0);
    model.dispose();
  });
});
