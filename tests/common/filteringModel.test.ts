import { TimeSpeed } from "scenerystack/scenery-phet";
import { describe, expect, it } from "vitest";
import { predictedOutputNoise } from "../../src/common/model/LockInMath.js";
import { FilteringModel } from "../../src/filtering/model/FilteringModel.js";

describe("FilteringModel", () => {
  it.each([0.1, 1])("records settled noise within 15%% of prediction at τ = %s s", (tau) => {
    const model = new FilteringModel();
    model.amplitudeProperty.value = 0.05;
    model.densityProperty.value = 0.005;
    model.orderProperty.value = 1;
    model.timeConstantProperty.value = tau;
    const settling = model.settlingTimeProperty.value;
    const required = Math.max(20 * tau, 5);
    const dt = 1 / 60;
    const settleFrames = Math.floor(settling / dt);
    for (let frame = 0; frame < settleFrames; frame++) {
      model.step(dt);
    }
    expect(model.measurementProgressProperty.value).toBe(0);
    for (let frame = 0; frame < Math.floor(required / 2 / dt); frame++) {
      model.step(dt);
    }
    expect(model.measurementProgressProperty.value).toBeGreaterThan(0);
    expect(model.measurementProgressProperty.value).toBeLessThan(1);
    expect(model.measuredSigmaProperty.value).toBeNaN();
    model.recordSigma();
    expect(model.measurementsProperty.value).toEqual([]);
    const deadline = settling + required + 1;
    while (model.measurementProgressProperty.value < 1 && model.timer.timeProperty.value < deadline) {
      model.step(dt);
    }
    expect(model.measurementProgressProperty.value).toBe(1);
    expect(model.timer.timeProperty.value).toBeCloseTo(settling + required, 1);
    model.recordSigma();
    expect(model.measurementsProperty.value).toHaveLength(1);
    const measured = model.measurementsProperty.value[0]?.sigma ?? NaN;
    const expected = predictedOutputNoise(0.005, tau, 1);
    expect(Math.abs(measured / expected - 1)).toBeLessThanOrEqual(0.15);
    model.dispose();
  });

  it("processes all samples at 10× even with a long frame", () => {
    const fast = new FilteringModel();
    const normal = new FilteringModel();
    fast.timer.timeSpeedProperty.value = TimeSpeed.FAST;
    for (let frame = 0; frame < 2; frame++) {
      fast.step(0.5);
    }
    for (let frame = 0; frame < 40; frame++) {
      normal.step(0.25);
    }
    expect(fast.timer.timeProperty.value).toBe(10);
    expect(fast.xProperty.value).toBe(normal.xProperty.value);
    expect(fast.measurementProgressProperty.value).toBe(1);
    expect(fast.measuredSigmaProperty.value).toBe(normal.measuredSigmaProperty.value);
    fast.reset();
    fast.timer.timeSpeedProperty.value = TimeSpeed.FAST;
    for (let frame = 0; frame < 60; frame++) {
      fast.step(1 / 60);
    }
    expect(fast.timer.timeProperty.value).toBeCloseTo(10, 10);
    expect(fast.xProperty.value).toBe(normal.xProperty.value);
    fast.dispose();
    normal.dispose();
  });

  it("records σ with the active time constant and slope", () => {
    const model = new FilteringModel();
    model.timeConstantProperty.value = 0.1;
    model.orderProperty.value = 3;
    for (let frame = 0; frame < 8 * 60; frame++) {
      model.step(1 / 60);
    }
    const sigma = model.measuredSigmaProperty.value;
    expect(sigma).toBeGreaterThan(0);
    model.recordSigma();
    expect(model.measurementsProperty.value).toEqual([{ tau: 0.1, n: 3, sigma }]);
    model.timeConstantProperty.value = 0.3;
    expect(model.measurementsProperty.value).toEqual([{ tau: 0.1, n: 3, sigma }]);
    model.clearMeasurements();
    expect(model.measurementsProperty.value).toEqual([]);
    model.dispose();
  });

  it("reaches the 99% step threshold within 2% of the predicted settling time", () => {
    const model = new FilteringModel();
    model.densityProperty.value = 0;
    model.timeConstantProperty.value = 0.03;
    model.orderProperty.value = 4;
    model.applyStep();
    expect(model.xProperty.value).toBe(0);
    const expected = model.settlingTimeProperty.value;
    const target = 0.99 * model.amplitudeProperty.value;
    while (model.xProperty.value < target && model.timer.timeProperty.value < expected * 1.02) {
      model.step(0.001);
    }
    expect(Math.abs(model.timer.timeProperty.value / expected - 1)).toBeLessThanOrEqual(0.02);
    expect(model.xProperty.value).toBeGreaterThanOrEqual(target);
    model.dispose();
  });
});
