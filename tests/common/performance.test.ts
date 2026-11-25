import { expect, it } from "vitest";
import { createSpectrumScratch } from "../../src/common/model/Spectrum.js";
import { SAMPLING_SETTINGS } from "../../src/LockInAmplifierConstants.js";
import { VirtualExperimentModel } from "../../src/lab/model/VirtualExperimentModel.js";

it("processes 10 seconds through the full Lab pipeline in less than 1.5 seconds", () => {
  const lab = new VirtualExperimentModel();
  try {
    lab.selectScenario("bridge");
    lab.randomizeScenario();
    expect(lab.reveal()).toEqual(lab.scenarios.bridge.reveal());
    lab.noise.pinkCorner = 100;
    lab.timer.isPlayingProperty.value = true;
    const step = SAMPLING_SETTINGS.MAX_STEP_SECONDS;
    const start = performance.now();
    for (let i = 0; i < 10 / step; i++) {
      lab.step(step);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1500);
    expect(lab.clock.timeProperty.value).toBe(10);
    expect(lab.readHistogram().bins.reduce((sum, count) => sum + count, 0)).toBe(2560);
    expect(Number.isFinite(lab.demodulator.r)).toBe(true);

    const record = new Float64Array(2 ** 11);
    const scratch = createSpectrumScratch(2 ** 11);
    expect(lab.copyScopeTrace(record)).toBe(record.length);
    expect(lab.readSpectrum(record, scratch)).toBe(scratch.magnitudes);
    expect(lab.readAveragedPower([record], scratch)).toBe(scratch.power);
    lab.reset();
    expect(lab.readSpectrum(record, scratch)).toBeUndefined();
  } finally {
    lab.dispose();
  }
});
