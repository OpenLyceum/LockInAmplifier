import { describe, expect, it } from "vitest";
import { Demodulator } from "../../src/common/model/Demodulator.js";
import { ReferenceOscillator } from "../../src/common/model/ReferenceOscillator.js";
import { SignalSource } from "../../src/common/model/SignalSource.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";

const { SAMPLE_RATE } = SAMPLING_SETTINGS;
const DEGREE = Math.PI / 180;

function phasorCase(phase: number): { demodulator: Demodulator; reference: ReferenceOscillator; signal: SignalSource } {
  const signal = new SignalSource({ amplitude: 1, frequency: 100, phase });
  const reference = new ReferenceOscillator(signal, { phase: 0 });
  const demodulator = new Demodulator({ timeConstant: 0.1, order: 4 });
  for (let i = 0; i < 2 * SAMPLE_RATE; i++) {
    const t = i / SAMPLE_RATE;
    demodulator.processSample(signal.valueAt(t), reference.inPhase(t), reference.quadrature(t));
  }
  return { demodulator, reference, signal };
}

describe("lock-in demodulation", () => {
  it("recovers the expected signed quadratures and phase, then nulls Y with auto-phase", () => {
    const { demodulator, reference, signal } = phasorCase(30 * DEGREE);
    try {
      expect(Math.abs(demodulator.x - 0.866)).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(demodulator.y - 0.5)).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(demodulator.r - 1.0)).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(demodulator.theta / DEGREE - 30.0)).toBeLessThanOrEqual(0.1);
      reference.phase += demodulator.autoPhase();
      for (let i = 2 * SAMPLE_RATE; i < 4 * SAMPLE_RATE; i++) {
        const t = i / SAMPLE_RATE;
        demodulator.processSample(signal.valueAt(t), reference.inPhase(t), reference.quadrature(t));
      }
      expect(Math.abs(demodulator.x - 1)).toBeLessThanOrEqual(1e-3);
      expect(Math.abs(demodulator.y)).toBeLessThan(1e-3);
    } finally {
      reference.dispose();
    }
  });

  it("reports negative X for a 120 degree input phase", () => {
    const { demodulator, reference } = phasorCase(120 * DEGREE);
    reference.dispose();
    expect(Math.abs(demodulator.x - -0.5)).toBeLessThanOrEqual(1e-3);
  });

  it.each([
    [1, 0.0793, 0.03],
    [2, 0.00629, 0.05],
  ] as const)("order %i has the expected 2f ripple", (order, amplitude, tolerance) => {
    const signal = new SignalSource({ frequency: 100 });
    usingReference(signal, (reference) => {
      const demodulator = new Demodulator({ timeConstant: 0.01, order });
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < SAMPLE_RATE; i++) {
        const t = i / SAMPLE_RATE;
        demodulator.processSample(signal.valueAt(t), reference.inPhase(t), reference.quadrature(t));
        if (i >= SAMPLE_RATE / 2) {
          min = Math.min(min, demodulator.x);
          max = Math.max(max, demodulator.x);
        }
      }
      expect(Math.abs((max - min) / (2 * amplitude) - 1)).toBeLessThanOrEqual(tolerance);
    });
  });

  it("beats at 0.5 Hz with a constant magnitude to within 1% when detuned (24 dB/oct removes the 2f image)", () => {
    const signal = new SignalSource({ frequency: 100 });
    usingReference(signal, (reference) => {
      reference.lockedProperty.value = false;
      reference.frequency = 99.5;
      const demodulator = new Demodulator({ timeConstant: 0.01, order: 4 });
      let previous = demodulator.x;
      let firstCrossing = 0;
      let lastCrossing = 0;
      let crossings = 0;
      let largestRadiusError = 0;
      let beatEnvelope = 0;
      let envelopeSamples = 0;
      for (let i = 0; i < 10 * SAMPLE_RATE; i++) {
        const t = i / SAMPLE_RATE;
        demodulator.processSample(signal.valueAt(t), reference.inPhase(t), reference.quadrature(t));

        // Average X over one image-frequency cycle to locate the baseband crossings.
        beatEnvelope += demodulator.x;
        envelopeSamples++;
        if (envelopeSamples === Math.floor(SAMPLE_RATE / 199.5)) {
          if (t >= 1 && beatEnvelope >= 0 && previous < 0) {
            if (crossings === 0) {
              firstCrossing = t;
            }
            lastCrossing = t;
            crossings++;
          }
          previous = beatEnvelope;
          beatEnvelope = 0;
          envelopeSamples = 0;
        }
        if (t >= 1) {
          largestRadiusError = Math.max(largestRadiusError, Math.abs(demodulator.r - 1));
        }
      }
      expect(Math.abs((crossings - 1) / (lastCrossing - firstCrossing) - 0.5)).toBeLessThanOrEqual(0.02);
      expect(largestRadiusError).toBeLessThanOrEqual(0.01);
    });
  });

  it("processes only the raw and filtered X channel in single-phase mode", () => {
    const demodulator = new Demodulator({ phaseOnly: true });
    demodulator.processSample(2, -3, NaN);
    expect(demodulator.xMix).toBe(-6);
    expect(demodulator.x).toBeLessThan(0);
    expect(demodulator.y).toBe(0);
    demodulator.setTimeConstant(0.2);
    expect(demodulator.filterResponse(0, 0).enbw).toBeCloseTo(5 / (64 * 0.2));
    demodulator.reset();
    expect(demodulator.xMix).toBe(0);
    expect(demodulator.r).toBe(0);
  });
});

function usingReference(signal: SignalSource, test: (reference: ReferenceOscillator) => void): void {
  const reference = new ReferenceOscillator(signal);
  try {
    test(reference);
  } finally {
    reference.dispose();
  }
}
