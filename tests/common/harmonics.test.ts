import { describe, expect, it } from "vitest";
import { Demodulator } from "../../src/common/model/Demodulator.js";
import { ReferenceOscillator } from "../../src/common/model/ReferenceOscillator.js";
import { SignalSource } from "../../src/common/model/SignalSource.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";

const { SAMPLE_RATE } = SAMPLING_SETTINGS;

function measure(signal: SignalSource, waveform: "sine" | "square", harmonic: 1 | 2 | 3): number {
  const reference = new ReferenceOscillator(signal, { waveform, harmonic, frequency: 100, locked: false });
  const demodulator = new Demodulator({ timeConstant: 1, order: 4 });
  for (let i = 0; i < 15 * SAMPLE_RATE; i++) {
    const t = i / SAMPLE_RATE;
    demodulator.processSample(signal.valueAt(t), reference.inPhase(t), reference.quadrature(t));
  }
  reference.dispose();
  return demodulator.r;
}

describe("harmonic response", () => {
  it("rejects 3f with a sinusoidal reference at f", () => {
    expect(measure(new SignalSource({ amplitude: 0.3, frequency: 300 }), "sine", 1)).toBeLessThan(1e-3);
  });

  it("a square reference at f detects 3f with one-third weight", () => {
    const result = measure(new SignalSource({ amplitude: 0.3, frequency: 300 }), "square", 1);
    expect(Math.abs(result / 0.1 - 1)).toBeLessThanOrEqual(0.02);
  });

  it("a sine reference tuned to 3f detects the full amplitude", () => {
    const result = measure(new SignalSource({ amplitude: 0.3, frequency: 300 }), "sine", 3);
    expect(Math.abs(result / 0.3 - 1)).toBeLessThanOrEqual(0.01);
  });

  it("detects the expected odd harmonics of a unipolar chopper and rejects 2f", () => {
    const chopper = new SignalSource({ waveform: "square01", amplitude: 1, frequency: 100 });
    const fundamental = measure(chopper, "sine", 1);
    chopper.reset();
    const second = measure(chopper, "sine", 2);
    chopper.reset();
    const third = measure(chopper, "sine", 3);
    expect(Math.abs(fundamental / (2 / Math.PI) - 1)).toBeLessThanOrEqual(0.01);
    expect(second).toBeLessThan(2e-3);
    expect(Math.abs(third / (2 / (3 * Math.PI)) - 1)).toBeLessThanOrEqual(0.01);
  });
});
