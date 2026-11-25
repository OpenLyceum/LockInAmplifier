/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 */

import { describe, expect, it, vi } from "vitest";
import { TimeModel } from "../src/common/TimeModel.js";
import { FilteringModel } from "../src/filtering/model/FilteringModel.js";
import { VirtualExperimentModel } from "../src/lab/model/VirtualExperimentModel.js";
import { MixingModel } from "../src/mixing/model/MixingModel.js";
import { PhaseDetectionModel } from "../src/phase/model/PhaseDetectionModel.js";
import { SignalAndNoiseModel } from "../src/signal-and-noise/model/SignalAndNoiseModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  { name: "SignalAndNoiseModel", create: () => new SignalAndNoiseModel() },
  { name: "MixingModel", create: () => new MixingModel() },
  { name: "FilteringModel", create: () => new FilteringModel() },
  { name: "PhaseDetectionModel", create: () => new PhaseDetectionModel() },
  { name: "VirtualExperimentModel", create: () => new VirtualExperimentModel() },
]);

describe("composed TimeModel disposal", () => {
  it("screen models dispose their owned timer", () => {
    {
      const model = new SignalAndNoiseModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new MixingModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new FilteringModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new PhaseDetectionModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
    {
      const model = new VirtualExperimentModel();
      const spy = vi.spyOn(model.timer, "dispose");
      model.dispose();
      expect(spy).toHaveBeenCalledOnce();
    }
  });
});
