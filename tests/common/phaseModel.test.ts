import { describe, expect, it } from "vitest";
import { PhaseDetectionModel } from "../../src/phase/model/PhaseDetectionModel.js";

function advance(model: PhaseDetectionModel, seconds: number): void {
  for (let frame = 0; frame < seconds * 60; frame++) {
    model.step(1 / 60);
  }
}

describe("PhaseDetectionModel", () => {
  it("Auto Phase zeroes Y and preserves the magnitude while paused", () => {
    const model = new PhaseDetectionModel();
    advance(model, 1);
    const magnitude = model.rProperty.value;
    model.timer.isPlayingProperty.value = false;
    model.autoPhase();
    expect(model.yProperty.value).toBeCloseTo(0, 12);
    expect(model.xProperty.value).toBeCloseTo(magnitude, 12);
    expect(model.rProperty.value).toBeCloseTo(magnitude, 12);
    model.dispose();
  });

  it("advances by 180 degrees in 1.0 ± 0.05 seconds at +0.5 Hz detune", () => {
    const model = new PhaseDetectionModel();
    model.densityProperty.value = 0;
    model.detuneProperty.value = 0.5;
    advance(model, 2);
    const start = model.timer.timeProperty.value;
    let previous = model.thetaProperty.value;
    let traveled = 0;
    while (traveled < Math.PI && model.timer.timeProperty.value - start < 1.05) {
      model.step(1 / 120);
      const angle = model.thetaProperty.value;
      traveled += Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous));
      previous = angle;
    }
    expect(traveled).toBeGreaterThanOrEqual(Math.PI);
    expect(Math.abs(model.timer.timeProperty.value - start - 1)).toBeLessThanOrEqual(0.05);
    model.dispose();
  });
});
