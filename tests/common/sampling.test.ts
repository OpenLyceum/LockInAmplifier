import { describe, expect, it } from "vitest";
import { Decimator } from "../../src/common/model/Decimator.js";
import { Histogram } from "../../src/common/model/Histogram.js";
import { ReferenceOscillator } from "../../src/common/model/ReferenceOscillator.js";
import { RingBuffer } from "../../src/common/model/RingBuffer.js";
import { RunningStats } from "../../src/common/model/RunningStats.js";
import { SampleClock } from "../../src/common/model/SampleClock.js";
import { SignalSource } from "../../src/common/model/SignalSource.js";

describe("fixed-rate sample acquisition", () => {
  it("carries fractional samples, drops excess frame time, and clears the remainder on reset", () => {
    const clock = new SampleClock();
    try {
      expect(clock.dt).toBe(1 / 20480);
      expect(clock.samplesDue(clock.dt / 2)).toBe(0);
      expect(clock.samplesDue(-1)).toBe(0);
      expect(clock.samplesDue(NaN)).toBe(0);
      expect(clock.samplesDue(clock.dt / 2)).toBe(1);
      expect(clock.samplesDue(3)).toBe(5120);
      expect(clock.timeProperty.value).toBe(5121 / 20480);
      expect(clock.samplesDue(clock.dt / 2)).toBe(0);
      clock.reset();
      expect(clock.timeProperty.value).toBe(0);
      expect(clock.samplesDue(clock.dt / 2)).toBe(0);
    } finally {
      clock.dispose();
    }
  });

  it("keeps analytic signal and locked reference phase continuous through a frequency edit", () => {
    const source = new SignalSource({ frequency: 1, amplitude: 2, dcOffset: 1 });
    const ref = new ReferenceOscillator(source, { frequency: 3 });
    try {
      expect(source.valueAt(0.25)).toBeCloseTo(3);
      expect(ref.inPhase(0.25)).toBeCloseTo(2);
      source.frequency = 2;
      expect(source.valueAt(0.25)).toBeCloseTo(3);
      expect(ref.inPhase(0.25)).toBeCloseTo(2);
      expect(source.valueAt(0.375)).toBeCloseTo(1);
      expect(ref.quadrature(0.375)).toBeCloseTo(-2);
      ref.lockedProperty.value = false;
      expect(ref.frequencyHz).toBe(3);
      ref.reset();
      expect(ref.frequencyHz).toBe(2);
    } finally {
      ref.dispose();
    }
  });

  it("copies the newest full record starting at a reference wrap across ring storage rollover", () => {
    const trace = new RingBuffer(8);
    const phase = new RingBuffer(8);
    const out = new Float64Array(4);
    for (let i = 0; i < 13; i++) {
      trace.push(i);
      phase.push(i % 3);
    }
    expect(trace.copyLatest(4, out)).toBe(4);
    expect(Array.from(out)).toEqual([9, 10, 11, 12]);
    expect(trace.copyTriggered(4, out, phase)).toBe(4);
    expect(Array.from(out)).toEqual([9, 10, 11, 12]);
    trace.push(13);
    phase.push(1);
    expect(trace.copyLatest(4, out)).toBe(4);
    expect(Array.from(out)).toEqual([10, 11, 12, 13]);
    expect(trace.copyTriggered(4, out, phase)).toBe(4);
    expect(Array.from(out)).toEqual([9, 10, 11, 12]);
    trace.reset();
    expect(trace.copyLatest(4, out)).toBe(0);
  });

  it("averages 80 samples per strip point", () => {
    const decimator = new Decimator();
    for (let i = 0; i < 79; i++) {
      expect(decimator.process(i)).toBeUndefined();
    }
    expect(decimator.process(79)).toBe(39.5);
    expect(decimator.process(42)).toBeUndefined();
    decimator.reset();
    for (let i = 0; i < 79; i++) {
      expect(decimator.process(0)).toBeUndefined();
    }
    expect(decimator.process(0)).toBe(0);
  });

  it("removes old moments and ranges the histogram from the current window", () => {
    const stats = new RunningStats(3);
    const histogram = new Histogram();
    const scratch = new Float64Array(3);
    for (const value of [-4, 10, 11, 12]) {
      stats.push(value);
    }
    expect(stats.mean).toBeCloseTo(11);
    expect(stats.variance).toBeCloseTo(2 / 3);
    histogram.update(stats, scratch);
    expect(Array.from(scratch)).toEqual([10, 11, 12]);
    expect(histogram.min).toBeCloseTo(11 - 4 * Math.sqrt(2 / 3));
    expect(histogram.max).toBeCloseTo(11 + 4 * Math.sqrt(2 / 3));
    expect(histogram.bins.reduce((sum, count) => sum + count, 0)).toBe(3);
    histogram.reset();
    expect(histogram.bins.every((count) => count === 0)).toBe(true);
    stats.reset();
    expect(stats.variance).toBe(0);
    stats.push(2);
    histogram.update(stats, scratch);
    expect(histogram.min).toBe(2);
    expect(histogram.max).toBe(2);
    expect(histogram.bins[histogram.bins.length / 2]).toBe(1);
  });
});
