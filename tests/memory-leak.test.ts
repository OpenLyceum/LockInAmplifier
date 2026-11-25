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

import { BooleanProperty, NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { describe, expect, it, vi } from "vitest";
import { RotaryKnob as LabRotaryKnob } from "../src/common/controls/RotaryKnob.js";
import { RotarySwitch } from "../src/common/controls/RotarySwitch.js";
import { ReferenceOscillator } from "../src/common/model/ReferenceOscillator.js";
import { RingBuffer } from "../src/common/model/RingBuffer.js";
import { SampleClock } from "../src/common/model/SampleClock.js";
import { SignalSource } from "../src/common/model/SignalSource.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { BlockDiagramNode, Probe } from "../src/common/view/BlockDiagramNode.js";
import { DisposalBag } from "../src/common/view/DisposalBag.js";
import { instrumentStrings } from "../src/common/view/instrumentText.js";
import { LockInAmplifierNumberControl } from "../src/common/view/LockInAmplifierNumberControl.js";
import { ReadoutRow } from "../src/common/view/ReadoutRow.js";
import { ScopeChartNode } from "../src/common/view/ScopeChartNode.js";
import { SlopeRadioButtonGroup } from "../src/common/view/SlopeRadioButtonGroup.js";
import { SpectrumChartNode } from "../src/common/view/SpectrumChartNode.js";
import { StripChartNode } from "../src/common/view/StripChartNode.js";
import { TimeConstantControl } from "../src/common/view/TimeConstantControl.js";
import { FilteringModel } from "../src/filtering/model/FilteringModel.js";
import { BodePlot, HistogramNode, NoiseScalingPlot } from "../src/filtering/view/FilteringPlots.js";
import { FilteringScreenSummaryContent } from "../src/filtering/view/FilteringScreenSummaryContent.js";
import Colors from "../src/LockInAmplifierColors.js";
import { NOISE_SETTINGS } from "../src/LockInAmplifierConstants.js";
import { VirtualExperimentModel } from "../src/lab/model/VirtualExperimentModel.js";
import { LabResponsePlots } from "../src/lab/view/LabResponsePlots.js";
import { VirtualExperimentScreenSummaryContent } from "../src/lab/view/VirtualExperimentScreenSummaryContent.js";
import { MixingModel } from "../src/mixing/model/MixingModel.js";
import { MixingScreenSummaryContent } from "../src/mixing/view/MixingScreenSummaryContent.js";
import { PhaseDetectionModel } from "../src/phase/model/PhaseDetectionModel.js";
import { PhaseDetectionScreenSummaryContent } from "../src/phase/view/PhaseDetectionScreenSummaryContent.js";
import { PhasorPlane } from "../src/phase/view/PhasorPlane.js";
import { RotaryKnob } from "../src/phase/view/RotaryKnob.js";
import { SignalAndNoiseModel } from "../src/signal-and-noise/model/SignalAndNoiseModel.js";
import { SignalAndNoiseScreenSummaryContent } from "../src/signal-and-noise/view/SignalAndNoiseScreenSummaryContent.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

const { EUROPE, NORTH_AMERICA } = NOISE_SETTINGS.MAINS_FREQUENCIES;
const mainsFrequencyProperty = new Property<typeof EUROPE | typeof NORTH_AMERICA>(NORTH_AMERICA);

describeDisposalLeaks([
  { name: "ReferenceOscillator", create: () => new ReferenceOscillator(new SignalSource()) },
  { name: "SampleClock", create: () => new SampleClock() },
  { name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true },
  {
    name: "SignalAndNoiseModel",
    create: () => new SignalAndNoiseModel(NOISE_SETTINGS.DEFAULT_SEED, mainsFrequencyProperty),
    keepAlive: () => [mainsFrequencyProperty],
  },
  { name: "MixingModel", create: () => new MixingModel() },
  { name: "FilteringModel", create: () => new FilteringModel() },
  { name: "PhaseDetectionModel", create: () => new PhaseDetectionModel() },
  {
    name: "VirtualExperimentModel",
    create: () => new VirtualExperimentModel(NOISE_SETTINGS.DEFAULT_SEED, mainsFrequencyProperty),
    keepAlive: () => [mainsFrequencyProperty],
  },
]);

const { charts, controls, lab, units } = instrumentStrings;
const chartOptions = {
  width: 400,
  height: 200,
  title: charts.inputStringProperty,
  yUnit: charts.voltageStringProperty,
};
const scopeWindowProperty = new NumberProperty(0.02);
const stripWindowProperty = new NumberProperty(10);
const bandwidthProperty = new NumberProperty(10);
const timeConstantProperty = new NumberProperty(0.3);
const orderProperty = new NumberProperty(1);
const probeProperty = new Property<Probe>(Probe.PRODUCT);
const history = new RingBuffer(4096);
history.push(0.2);
history.push(0.3);

// memory-leak-covers: ChartFrame, TimeChartNode
describeDisposalLeaks([
  {
    name: "Lab RotaryKnob",
    create: () =>
      new LabRotaryKnob(bandwidthProperty, new Range(1, 5000), {
        captionStringProperty: lab.frequencyStringProperty,
        valueStringProperty: units.hertzStringProperty,
      }),
    keepAlive: () => [bandwidthProperty],
  },
  {
    name: "RotarySwitch",
    create: () =>
      new RotarySwitch(
        orderProperty,
        [
          { value: 1, stringProperty: lab.oneFStringProperty },
          { value: 2, stringProperty: lab.twoFStringProperty },
        ],
        { captionStringProperty: lab.harmonicStringProperty },
      ),
    keepAlive: () => [orderProperty],
  },
  {
    name: "DisposalBag",
    create: () => {
      const bag = new DisposalBag();
      bag.link(bandwidthProperty, () => {
        // A live external Property owns this listener until the bag unlinks it.
      });
      return bag;
    },
    idempotentDispose: true,
  },
  {
    name: "ScopeChartNode",
    create: () => {
      const node = new ScopeChartNode({ input: history }, history, {
        ...chartOptions,
        windowProperty: scopeWindowProperty,
        traces: [{ key: "input", label: charts.inputStringProperty, color: Colors.inputTraceColorProperty }],
        mean: () => 0.25,
      });
      node.step(0);
      return node;
    },
  },
  {
    name: "StripChartNode",
    create: () => {
      const node = new StripChartNode(history, {
        ...chartOptions,
        windowProperty: stripWindowProperty,
        color: Colors.outputTraceColorProperty,
        predicted: bandwidthProperty,
      });
      node.step(0);
      return node;
    },
  },
  {
    name: "SpectrumChartNode",
    create: () => {
      const node = new SpectrumChartNode({
        ...chartOptions,
        color: Colors.inputTraceColorProperty,
        magnitudes: () => null,
      });
      node.step(0);
      return node;
    },
  },
  {
    name: "BlockDiagramNode",
    create: () => new BlockDiagramNode(probeProperty, 800, { dual: true }),
    keepAlive: () => [probeProperty],
  },
  {
    name: "LockInAmplifierNumberControl",
    create: () =>
      new LockInAmplifierNumberControl(
        controls.bandwidthStringProperty,
        bandwidthProperty,
        new Range(0.1, 1000),
        units.hertzStringProperty,
        { logarithmic: true },
      ),
    keepAlive: () => [bandwidthProperty],
  },
  {
    name: "TimeConstantControl",
    create: () => new TimeConstantControl(timeConstantProperty, controls.timeConstantStringProperty),
    keepAlive: () => [timeConstantProperty],
  },
  {
    name: "SlopeRadioButtonGroup",
    create: () => new SlopeRadioButtonGroup(orderProperty, controls.slopeStringProperty),
    keepAlive: () => [orderProperty],
  },
  {
    name: "ReadoutRow",
    create: () => new ReadoutRow(charts.inputStringProperty, charts.waitingStringProperty, 220),
  },
]);

// memory-leak-covers: KnobDragListener
const filterModel = new FilteringModel();
const phaseModel = new PhaseDetectionModel();
const dualProperty = new BooleanProperty(true);
const labModel = new VirtualExperimentModel();
describeDisposalLeaks([
  {
    name: "HistogramNode",
    create: () => {
      const node = new HistogramNode(filterModel);
      node.step(0, new Range(0, 0.1));
      return node;
    },
  },
  { name: "BodePlot", create: () => new BodePlot(filterModel, 320), keepAlive: () => [filterModel] },
  { name: "NoiseScalingPlot", create: () => new NoiseScalingPlot(filterModel, 320), keepAlive: () => [filterModel] },
  {
    name: "PhasorPlane",
    create: () => {
      const node = new PhasorPlane(phaseModel, dualProperty);
      node.step(0);
      return node;
    },
    keepAlive: () => [phaseModel, dualProperty],
  },
  {
    // Builds both private ResponsePlot charts.
    name: "LabResponsePlots",
    create: () => new LabResponsePlots(labModel.rowsProperty, 640),
    keepAlive: () => [labModel],
  },
  {
    name: "RotaryKnob",
    create: () =>
      new RotaryKnob(phaseModel.referencePhaseProperty, controls.phaseStringProperty, controls.phaseStringProperty),
    keepAlive: () => [phaseModel],
  },
]);

// Each summary must unlink from its still-live screen model when disposed.
const summaryModels = {
  filtering: new FilteringModel(),
  mixing: new MixingModel(),
  phase: new PhaseDetectionModel(),
  signalandnoise: new SignalAndNoiseModel(),
  lab: new VirtualExperimentModel(),
};
describeDisposalLeaks([
  {
    name: "FilteringScreenSummaryContent",
    create: () => new FilteringScreenSummaryContent(summaryModels.filtering),
    keepAlive: () => [summaryModels.filtering],
  },
  {
    name: "MixingScreenSummaryContent",
    create: () => new MixingScreenSummaryContent(summaryModels.mixing),
    keepAlive: () => [summaryModels.mixing],
  },
  {
    name: "PhaseDetectionScreenSummaryContent",
    create: () => new PhaseDetectionScreenSummaryContent(summaryModels.phase),
    keepAlive: () => [summaryModels.phase],
  },
  {
    name: "SignalAndNoiseScreenSummaryContent",
    create: () => new SignalAndNoiseScreenSummaryContent(summaryModels.signalandnoise),
    keepAlive: () => [summaryModels.signalandnoise],
  },
  {
    name: "VirtualExperimentScreenSummaryContent",
    create: () => new VirtualExperimentScreenSummaryContent(summaryModels.lab),
    keepAlive: () => [summaryModels.lab],
  },
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
