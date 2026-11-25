import { describe, expect, it } from "vitest";
import { FilteringModel } from "../../src/filtering/model/FilteringModel.js";

describe("FilteringModel", () => {
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
