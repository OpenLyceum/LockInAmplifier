import { describe, expect, it } from "vitest";
import { SIGNAL_NOISE_SETTINGS, SPECTRUM_SETTINGS } from "../../src/LockInAmplifierConstants.js";
import { SignalAndNoiseModel } from "../../src/signal-and-noise/model/SignalAndNoiseModel.js";

describe("SignalAndNoiseModel", () => {
  it("computes band SNR from RMS signal and white density times the square root of the bandwidth", () => {
    const model = new SignalAndNoiseModel();
    model.bandwidthProperty.value = 100;
    const expected = 20 * Math.log10(0.05 / Math.SQRT2 / (0.005 * Math.sqrt(100)));
    expect(model.bandSnrProperty.value).toBeCloseTo(expected, 10);
    model.bandwidthProperty.value = 1;
    expect(model.bandSnrProperty.value - expected).toBeCloseTo(20, 10);
    model.densityProperty.value = 0.01;
    expect(model.bandSnrProperty.value).toBeCloseTo(expected + 20 - 20 * Math.log10(2), 10);
    model.pinkCornerProperty.value = 100;
    expect(model.bandSnrProperty.value).toBeLessThan(expected + 20 - 20 * Math.log10(2));
    model.dispose();
  });

  it("clears histories and restores controls and deterministic sampling on reset", () => {
    const model = new SignalAndNoiseModel();
    model.step(0.2);
    const original = model.traces.input.atAge(0);
    model.step(0.2);
    expect(model.averagedRecordsProperty.value).toBe(1);
    model.amplitudeProperty.value = 0.2;
    model.frequencyProperty.value = 200;
    model.densityProperty.value = 0.01;
    model.mainsAmplitudeProperty.value = 0.4;
    model.pinkCornerProperty.value = 100;
    model.bandwidthProperty.value = 1;
    model.recordLengthProperty.value = SPECTRUM_SETTINGS.RECORD_LENGTHS[0];
    model.averagesProperty.value = SPECTRUM_SETTINGS.AVERAGE_COUNTS[3];
    model.showSignalProperty.value = true;
    model.showBandProperty.value = true;
    model.timer.isPlayingProperty.value = false;

    model.reset();
    expect(model.timer.isPlayingProperty.value).toBe(true);
    expect(model.timer.timeProperty.value).toBe(0);
    expect(model.traces.input.length).toBe(0);
    expect(model.traces.signal.length).toBe(0);
    expect(model.phaseHistory.length).toBe(0);
    expect(model.spectrumMagnitudes).toBeNull();
    expect(model.recordLengthProperty.value).toBe(SIGNAL_NOISE_SETTINGS.RECORD_LENGTH);
    expect(model.averagesProperty.value).toBe(SIGNAL_NOISE_SETTINGS.AVERAGES);
    expect(model.bandwidthProperty.value).toBe(SIGNAL_NOISE_SETTINGS.BANDWIDTH);
    expect(model.showSignalProperty.value).toBe(false);
    expect(model.showBandProperty.value).toBe(false);
    model.step(0.2);
    expect(model.traces.input.atAge(0)).toBe(original);
    model.dispose();
  });
});
