import { describe, expect, it } from "vitest";
import { SAMPLING_SETTINGS, LAB_INSTRUMENT_SETTINGS as settings } from "../../src/LockInAmplifierConstants.js";
import { VirtualExperimentModel } from "../../src/lab/model/VirtualExperimentModel.js";

function acquire(model: VirtualExperimentModel, seconds: number): void {
  const cap = SAMPLING_SETTINGS.MAX_STEP_SECONDS;
  for (let time = 0; time < seconds; time += cap) {
    model.step(Math.min(cap, seconds - time));
  }
}

describe("virtual experiment lock-in", () => {
  it("lights input overload and mixes clipped samples while keeping the scope raw", () => {
    const model = new VirtualExperimentModel();
    try {
      model.noiseDensityProperty.value = 0;
      model.noise.driftRate = 0;
      const light = model.scenarios.choppedLight;
      light.backgroundIntensity = 0;
      model.inputRangeProperty.value = 0.1;
      acquire(model, 2);
      expect(model.inputOverloadProperty.value).toBe(true);
      expect(model.demodulator.x).toBeCloseTo((0.1 * 2) / Math.PI, 4);
      const trace = new Float64Array(SAMPLING_SETTINGS.SAMPLE_RATE / 10);
      model.copyScopeTrace(trace);
      expect(Math.max(...trace)).toBe(1);
      model.inputRangeProperty.value = 10;
      acquire(model, 2);
      expect(model.inputOverloadProperty.value).toBe(false);
      expect(model.demodulator.x).toBeCloseTo(2 / Math.PI, 3);
    } finally {
      model.dispose();
    }
  });

  it("picks the smallest full scale that covers a known negative X", () => {
    const model = new VirtualExperimentModel();
    try {
      model.demodulator.reset(-0.003);
      model.autoRange();
      expect(model.sensitivityProperty.value).toBe(0.005);
    } finally {
      model.dispose();
    }
  });

  it("records the current measurement and settings, caps records and deletes one row", () => {
    const model = new VirtualExperimentModel();
    try {
      model.sampleProperty.value = "B";
      model.phaseProperty.value = 0.2;
      acquire(model, 1);
      const { x, y, r, theta } = model.demodulator;
      model.record();
      expect(model.rowsProperty.value[0]).toEqual({
        scenario: "choppedLight",
        sample: "B",
        frequency: 100,
        phase: 0.2,
        harmonic: 1,
        x,
        y,
        r,
        theta,
        clipped: false,
      });
      for (let index = 0; index < settings.MAX_ROWS; index++) {
        model.record();
      }
      expect(model.rowsProperty.value).toHaveLength(50);
      model.deleteRow(0);
      expect(model.rowsProperty.value).toHaveLength(49);
    } finally {
      model.dispose();
    }
  });

  it("preserves each scenario notebook until that sample is replaced", () => {
    const model = new VirtualExperimentModel();
    try {
      acquire(model, 0.25);
      model.record();
      const choppedRows = model.rowsProperty.value;
      model.selectScenario("rcFilter");
      acquire(model, 1);
      expect(model.inputOverloadProperty.value).toBe(false);
      model.record();
      model.selectScenario("choppedLight");
      expect(model.rowsProperty.value).toEqual(choppedRows);
      model.randomizeScenario();
      expect(model.rowsProperty.value).toHaveLength(0);
      model.selectScenario("rcFilter");
      expect(model.rowsProperty.value).toHaveLength(1);
    } finally {
      model.dispose();
    }
  });

  it("follows the chopper and rejects records during the half-second re-lock", () => {
    const model = new VirtualExperimentModel();
    try {
      acquire(model, 1);
      model.chopperFrequencyProperty.value = 137;
      expect(model.reference.frequencyHz).toBe(137);
      expect(model.referenceUnlockProperty.value).toBe(true);
      acquire(model, 0.375);
      model.record();
      expect(model.rowsProperty.value).toHaveLength(0);
      model.step(0.125);
      expect(model.referenceUnlockProperty.value).toBe(false);
      model.record();
      expect(model.rowsProperty.value[0]?.frequency).toBe(137);
    } finally {
      model.dispose();
    }
  });

  it("adds the measured residual phase and brings Y close to zero", () => {
    const model = new VirtualExperimentModel();
    try {
      model.selectScenario("rcFilter");
      model.noiseDensityProperty.value = 0;
      model.noise.driftRate = 0;
      model.phaseProperty.value = 0.2;
      acquire(model, 2);
      model.autoPhase();
      acquire(model, 2);
      expect(model.demodulator.y).toBeCloseTo(0, 4);
      expect(model.demodulator.x).toBeGreaterThan(0);
    } finally {
      model.dispose();
    }
  });

  it("restores initial controls, acquisition, seeded unknowns and table on reset", () => {
    const model = new VirtualExperimentModel();
    const initial = new VirtualExperimentModel();
    try {
      model.randomizeScenario();
      model.selectScenario("bridge");
      model.strainTrimProperty.value = 600e-6;
      model.capacitanceTrimProperty.value = 40e-12;
      model.internalFrequencyLogProperty.value = 3;
      model.firstDisplayProperty.value = "r";
      model.secondDisplayProperty.value = "theta";
      model.harmonicProperty.value = 3;
      model.filterOrderProperty.value = 2;
      model.timeConstantProperty.value = 0.3;
      model.chopperFrequencyProperty.value = 200;
      model.sampleProperty.value = "C";
      model.noiseDensityProperty.value = settings.HIGH_NOISE_DENSITY;
      model.phaseProperty.value = Math.PI;
      acquire(model, 0.25);
      model.record();
      expect(model.rowsProperty.value).toHaveLength(1);
      model.timer.isPlayingProperty.value = false;
      model.reset();

      expect(model.scenarioProperty.value).toBe("choppedLight");
      expect(model.reveal()).toEqual(initial.reveal());
      expect(model.timer.isPlayingProperty.value).toBe(true);
      expect(model.clock.timeProperty.value).toBe(0);
      expect(model.inputRangeProperty.value).toBe(10);
      expect(model.sensitivityProperty.value).toBe(1);
      expect(model.inputOverloadProperty.value).toBe(false);
      expect(model.referenceUnlockProperty.value).toBe(false);
      expect(model.reference.lockedProperty.value).toBe(true);
      expect(model.reference.frequencyHz).toBe(100);
      expect(model.reference.phase).toBe(0);
      expect(model.reference.harmonic).toBe(1);
      expect(model.filterOrderProperty.value).toBe(4);
      expect(model.timeConstantProperty.value).toBe(0.1);
      expect(model.rowsProperty.value).toEqual([]);
      expect(model.firstDisplayProperty.value).toBe("x");
      expect(model.secondDisplayProperty.value).toBe("y");
      expect(model.sampleProperty.value).toBe("none");
      expect(model.strainTrimProperty.value).toBe(0);
      expect(model.capacitanceTrimProperty.value).toBe(0);
      expect(model.noiseDensityProperty.value).toBe(initial.noiseDensityProperty.value);
      expect(model.demodulator.r).toBe(0);
    } finally {
      model.dispose();
      initial.dispose();
    }
  });
});
