import { Random } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { Demodulator } from "../../src/common/model/Demodulator.js";
import { ReferenceOscillator } from "../../src/common/model/ReferenceOscillator.js";
import { SignalSource } from "../../src/common/model/SignalSource.js";
import { LAB_SETTINGS, SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";
import { BridgeScenario } from "../../src/lab/model/scenarios/BridgeScenario.js";
import { ChoppedLightScenario } from "../../src/lab/model/scenarios/ChoppedLightScenario.js";
import type { LabScenario } from "../../src/lab/model/scenarios/LabScenario.js";
import { RcFilterScenario } from "../../src/lab/model/scenarios/RcFilterScenario.js";

const FREQUENCY = 100;

function measure(scenario: LabScenario): Demodulator {
  const reference = new ReferenceOscillator(new SignalSource({ frequency: FREQUENCY }));
  const demodulator = new Demodulator({ timeConstant: 0.1, order: 4 });
  for (let i = 0; i < 2 * SAMPLING_SETTINGS.SAMPLE_RATE; i++) {
    const t = i / SAMPLING_SETTINGS.SAMPLE_RATE;
    demodulator.processSample(scenario.inputAt(t, reference), reference.inPhase(t), reference.quadrature(t));
  }
  reference.dispose();
  return demodulator;
}

describe("Lab scenarios", () => {
  it("detects bridge resistance imbalance without a quadrature term when C_s is zero", () => {
    const bridge = new BridgeScenario();
    bridge.hiddenParameters.strain = 1e-3 / LAB_SETTINGS.GAUGE_FACTOR;
    bridge.hiddenParameters.strayCapacitance = 0;
    bridge.excitationAmplitude = 1;
    const result = measure(bridge);
    expect(Math.abs(result.x / 2.4988e-4 - 1)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(result.y)).toBeLessThan(1e-7);
  });

  it("reports a negative capacitive quadrature and nulls with exact trims", () => {
    const bridge = new BridgeScenario();
    const delta = 1e-3;
    const capacitance = 1e-3 / (2 * Math.PI * FREQUENCY * bridge.nominalResistance);
    bridge.hiddenParameters.strain = delta / LAB_SETTINGS.GAUGE_FACTOR;
    bridge.hiddenParameters.strayCapacitance = capacitance;
    expect(Math.abs(measure(bridge).y / -2.5e-4 - 1)).toBeLessThanOrEqual(0.01);
    bridge.resistanceTrim = delta;
    bridge.capacitanceTrim = capacitance;
    expect(measure(bridge).r).toBeLessThan(1e-8);
  });

  it("measures the RC cutoff at (0.5, −0.5) and −45 degrees", () => {
    const filter = new RcFilterScenario();
    filter.hiddenParameters.cutoffFrequency = FREQUENCY;
    const result = measure(filter);
    expect(result.x).toBeCloseTo(0.5, 5);
    expect(result.y).toBeCloseTo(-0.5, 5);
    expect(Math.abs((result.theta * 180) / Math.PI - -45.0)).toBeLessThanOrEqual(0.2);
  });

  it("detects the expected first harmonic of a chopped LED with sample A in the beam", () => {
    const chopped = new ChoppedLightScenario();
    chopped.sampleInBeam = "A";
    chopped.hiddenParameters.A = 0.4;
    chopped.ledIntensity = 1;
    chopped.backgroundIntensity = 0;
    chopped.chopFrequency = FREQUENCY;
    expect(Math.abs(measure(chopped).r / ((0.4 * 2) / Math.PI) - 1)).toBeLessThanOrEqual(0.01);
  });

  it("shows room light flicker at twice the mains frequency", () => {
    const chopped = new ChoppedLightScenario();
    chopped.mainsFrequency = 50;
    chopped.ledOn = false;
    expect(measure(chopped).r).toBeCloseTo(chopped.backgroundIntensity * 0.2, 4);
  });

  it("randomizes reproducibly, with every physical quantity in range", () => {
    const a = [new ChoppedLightScenario(), new BridgeScenario(), new RcFilterScenario()] as const;
    const b = [new ChoppedLightScenario(), new BridgeScenario(), new RcFilterScenario()] as const;
    const randomA = new Random({ seed: 1 });
    const randomB = new Random({ seed: 1 });
    for (const [i, scenario] of a.entries()) {
      const other = b[i] as LabScenario;
      scenario.randomize(randomA);
      other.randomize(randomB);
      expect(scenario.reveal()).toEqual(other.reveal());
    }
    for (const transmission of Object.values(a[0].hiddenParameters)) {
      expect(transmission).toBeGreaterThanOrEqual(0.05);
      expect(transmission).toBeLessThanOrEqual(0.9);
    }
    expect(a[1].hiddenParameters.strain).toBeGreaterThanOrEqual(100e-6);
    expect(a[1].hiddenParameters.strain).toBeLessThanOrEqual(1000e-6);
    expect(a[1].hiddenParameters.strayCapacitance).toBeGreaterThanOrEqual(5e-12);
    expect(a[1].hiddenParameters.strayCapacitance).toBeLessThanOrEqual(50e-12);
    expect(a[2].hiddenParameters.cutoffFrequency).toBeGreaterThanOrEqual(80);
    expect(a[2].hiddenParameters.cutoffFrequency).toBeLessThanOrEqual(2000);
  });
});
