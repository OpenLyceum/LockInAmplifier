/** Experiment drawings and controls, with a switchable pre-clipping input scope. */
import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range, roundSymmetric } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { AlignBox, Circle, HBox, Line, Node, Path, Rectangle, RichText, VBox } from "scenerystack/scenery";
import { HSlider } from "scenerystack/sun";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { instrumentCheckbox, instrumentCombo } from "../../common/view/instrumentControls.js";
import { formatValue, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import { ScopeChartNode } from "../../common/view/ScopeChartNode.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  LAB_DRAWING_SETTINGS as drawing,
  LAB_LAYOUT_SETTINGS as layout,
  LAB_INSTRUMENT_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { dial, numericKnob } from "./labControls.js";
import { lab, labA11y, labHeadingFont, labLabelFont, sampleLabels, scenarioLabels } from "./labText.js";

const names = labA11y.controls;
type Scenario = VirtualExperimentModel["scenarioProperty"]["value"];
const hints = {
  choppedLight: lab.lightHintStringProperty,
  bridge: lab.bridgeHintStringProperty,
  rcFilter: lab.rcHintStringProperty,
};
const scopeWindow = new Property<number>(settings.SCOPE_WINDOW);
const g = drawing.GRID;

function label(text: TReadOnlyProperty<string>, x: number, y: number = drawing.LABEL_Y): Node {
  return instrumentText(text, { font: labLabelFont, centerX: x, centerY: y });
}

function lightDrawing(wheel: Node, sample: TReadOnlyProperty<string>, background: number): Node {
  const [led, chopper, slot, diode, lamp] = drawing.BEAM_X;
  const y = drawing.BEAM_Y;
  const beam = new Path(new Shape().moveTo(led, y).lineTo(diode, y), {
    stroke: Colors.labWarningColorProperty,
    lineWidth: drawing.SIGNAL_WIDTH,
    lineDash: [g / 2, g / 3],
  });
  const ledBody = new Circle(g, { centerX: led, centerY: y, fill: Colors.labWarningColorProperty });
  const ledLeads = new Path(
    new Shape()
      .moveTo(led - g, y - g / 3)
      .lineTo(led - 2 * g, y - g / 3)
      .moveTo(led - g, y + g / 3)
      .lineTo(led - 2 * g, y + g / 3),
    {
      stroke: Colors.axisColorProperty,
      lineWidth: drawing.SIGNAL_WIDTH,
    },
  );
  const slotFrame = new Rectangle(slot - g, y - g * 1.4, g * 2, g * 2.8, {
    cornerRadius: layout.KEY_RADIUS,
    fill: Colors.badgeBackgroundColorProperty,
    stroke: Colors.axisColorProperty,
  });
  const diodeBody = new Rectangle(diode - g, y - g, g * 2, g * 2, {
    cornerRadius: layout.KEY_RADIUS,
    fill: Colors.inputTraceColorProperty,
  });
  const lampIcon = new Path(
    new Shape()
      .moveTo(lamp - g, y - g / 2)
      .lineTo(lamp - g / 2, y - 2 * g)
      .lineTo(lamp + g / 2, y - 2 * g)
      .lineTo(lamp + g, y - g / 2)
      .close()
      .moveTo(lamp, y - g / 2)
      .lineTo(lamp, y + g)
      .moveTo(lamp - g, y + g)
      .lineTo(lamp + g, y + g),
    {
      stroke: Colors.labWarningColorProperty,
      lineWidth: drawing.SIGNAL_WIDTH,
    },
  );
  const pickup = new Path(
    new Shape()
      .moveTo(diode + g, y)
      .lineTo(diode + 2 * g, y)
      .lineTo(diode + 2 * g, y + 3 * g),
    {
      stroke: Colors.inputTraceColorProperty,
      lineWidth: drawing.SIGNAL_WIDTH,
    },
  );
  const sync = new Line(chopper, y + drawing.RADIUS, chopper, y + 3 * g, {
    stroke: Colors.referenceTraceColorProperty,
    lineWidth: drawing.SIGNAL_WIDTH,
  });
  const roomLight = new Line(lamp - g * 1.5, y - g / 3, diode + g * 1.5, y - g / 3, {
    stroke: Colors.labWarningColorProperty,
    lineDash: [g / 3, g / 2],
    opacity: 0.7,
  });
  const backgroundLabelProperty = new DerivedProperty([lab.percentStringProperty], (pattern) =>
    formatValue(pattern, background * 100, 0),
  );
  wheel.setTranslation(chopper, y);
  return new Node({
    children: [
      beam,
      ledLeads,
      ledBody,
      pickup,
      sync,
      roomLight,
      wheel,
      slotFrame,
      label(sample, slot, y),
      diodeBody,
      lampIcon,
      label(lab.ledStringProperty, led),
      label(lab.chopperStringProperty, chopper),
      label(lab.sampleSlotStringProperty, slot),
      label(lab.photodiodeStringProperty, diode),
      label(lab.roomLampStringProperty, lamp),
      label(backgroundLabelProperty, lamp, y + g * 2),
    ],
  });
}

function bridgeDrawing(cantilever: Path): Node {
  const x = drawing.BRIDGE_ORIGIN_X;
  const y = drawing.BRIDGE_ORIGIN_Y;
  const arm = drawing.BRIDGE_ARM;
  const loop = new Shape()
    .moveTo(x, y - arm)
    .lineTo(x + arm, y)
    .lineTo(x, y + arm)
    .lineTo(x - arm, y)
    .close()
    .moveTo(x + arm, y)
    .lineTo(drawing.BRIDGE_PICKUP_X, y)
    .moveTo(x - arm, y)
    .lineTo(x - arm - g * 2, y);
  const circuit = new Path(loop, { stroke: Colors.axisColorProperty, lineWidth: drawing.SIGNAL_WIDTH });
  const arms = [
    { dx: -1, dy: -1, angle: -Math.PI / 4 },
    { dx: 1, dy: -1, angle: Math.PI / 4 },
    { dx: -1, dy: 1, angle: Math.PI / 4 },
    { dx: 1, dy: 1, angle: -Math.PI / 4 },
  ].map(
    ({ dx, dy, angle }, index) =>
      new Node({
        x: x + (dx * arm) / 2,
        y: y + (dy * arm) / 2,
        rotation: angle,
        children: [
          new Rectangle(-g, -g / 3, g * 2, (g * 2) / 3, {
            fill: index === 0 ? Colors.labWarningColorProperty : Colors.chartBackgroundColorProperty,
            stroke: Colors.axisColorProperty,
          }),
        ],
      }),
  );
  const x0 = drawing.CANTILEVER_X;
  const y0 = drawing.CANTILEVER_Y;
  const mount = new Rectangle(x0 - g / 2, y0 - g, g / 2, 2 * g, { fill: Colors.mutedTextColorProperty });
  const gauge = new Rectangle(x0 + g / 2, y0 - g / 2, g * 2, g / 2, {
    cornerRadius: layout.KEY_RADIUS,
    fill: Colors.labWarningColorProperty,
  });
  return new Node({
    children: [
      circuit,
      ...arms,
      mount,
      cantilever,
      gauge,
      label(lab.bridgeDriveStringProperty, g * 3),
      label(lab.bridgeOutputStringProperty, drawing.BRIDGE_PICKUP_X),
      label(lab.bridgeGaugeStringProperty, x0 + drawing.CANTILEVER_LENGTH / 2),
    ],
  });
}

function rcDrawing(): Node {
  const { BOX_X: x, BOX_Y: y, BOX_WIDTH: width, BOX_HEIGHT: height } = drawing;
  const centreY = y + height / 2;
  const sourceX = x - g * 5;
  const outputX = x + width + g * 5;
  return new Node({
    children: [
      new Line(sourceX, centreY, x, centreY, {
        stroke: Colors.referenceTraceColorProperty,
        lineWidth: layout.CABLE_WIDTH,
      }),
      new Line(x + width, centreY, outputX, centreY, {
        stroke: Colors.inputTraceColorProperty,
        lineWidth: layout.CABLE_WIDTH,
      }),
      new Rectangle(x, y, width, height, {
        fill: Colors.labFaceColorProperty,
        stroke: Colors.knobRimColorProperty,
        cornerRadius: layout.KEY_RADIUS,
      }),
      new Circle(layout.CONNECTOR_RADIUS, { x, y: centreY, fill: Colors.referenceTraceColorProperty }),
      new Circle(layout.CONNECTOR_RADIUS, { x: x + width, y: centreY, fill: Colors.inputTraceColorProperty }),
      label(lab.blackBoxStringProperty, x + width / 2, centreY),
      label(lab.rcInStringProperty, x + 2 * g, centreY),
      label(lab.rcOutStringProperty, x + width - 2 * g, centreY),
      label(lab.rcDriveStringProperty, sourceX),
      label(lab.rcReturnStringProperty, outputX),
    ],
  });
}

export class LabApparatusNode extends Node {
  private readonly blade = new Node({
    children: [
      new Circle(drawing.RADIUS, { fill: Colors.knobBodyColorProperty, stroke: Colors.knobRimColorProperty }),
      new Path(
        new Shape()
          .moveTo(0, -drawing.BLADE_RADIUS)
          .arc(0, 0, drawing.BLADE_RADIUS, -Math.PI / 2, Math.PI / 2)
          .close(),
        {
          fill: Colors.chartBackgroundColorProperty,
          stroke: Colors.labWarningColorProperty,
        },
      ),
      new Circle(drawing.APERTURE_RADIUS, { fill: Colors.knobRimColorProperty }),
    ],
  });
  private readonly cantilever = new Path(null, { stroke: Colors.axisColorProperty, lineWidth: layout.CABLE_WIDTH });
  public readonly signalPort = new Circle(layout.CONNECTOR_RADIUS, {
    fill: Colors.chartBackgroundColorProperty,
    stroke: Colors.inputTraceColorProperty,
    lineWidth: layout.CABLE_WIDTH,
  });
  public readonly syncPort = new Circle(layout.CONNECTOR_RADIUS, {
    fill: Colors.chartBackgroundColorProperty,
    stroke: Colors.referenceTraceColorProperty,
    lineWidth: layout.CABLE_WIDTH,
  });
  private readonly scope: ScopeChartNode<"input">;
  private readonly scopeVisibleProperty = new BooleanProperty(false);

  private readonly model: VirtualExperimentModel;

  public constructor(model: VirtualExperimentModel, listParent: Node) {
    super();
    this.model = model;
    const width = layout.APPARATUS_WIDTH;
    const scenario = model.scenarioProperty;
    const is = (key: Scenario) => new DerivedProperty([scenario], (value) => value === key);
    const showingDrawingProperty = new DerivedProperty([this.scopeVisibleProperty], (visible) => !visible);
    const choose = instrumentCombo(
      scenario,
      [
        { value: "choppedLight", labelProperty: scenarioLabels.choppedLight },
        { value: "bridge", labelProperty: scenarioLabels.bridge },
        { value: "rcFilter", labelProperty: scenarioLabels.rcFilter },
      ],
      listParent,
      names.experimentStringProperty,
    );
    const scopeToggle = instrumentCheckbox(
      this.scopeVisibleProperty,
      lab.scopeStringProperty,
      names.scopeStringProperty,
    );
    const sampleNames = [sampleLabels.none, sampleLabels.A, sampleLabels.B, sampleLabels.C];
    const samples = ["none", "A", "B", "C"] as const;
    const sampleIndexProperty = new NumberProperty(0, { range: new Range(0, samples.length - 1) });
    sampleIndexProperty.lazyLink((index) => {
      model.sampleProperty.value = samples[index] ?? "none";
    });
    model.sampleProperty.link((sample) => {
      sampleIndexProperty.value = samples.indexOf(sample);
    });
    const sampleSlider = new HSlider(sampleIndexProperty, sampleIndexProperty.range, {
      accessibleName: names.sampleStringProperty,
      constrainValue: roundSymmetric,
      keyboardStep: 1,
      shiftKeyboardStep: 1,
      pdomCreateAriaValueText: (index) => sampleNames[index]?.value ?? sampleLabels.none.value,
      trackSize: new Dimension2(drawing.SLIDER_WIDTH, drawing.SLIDER_HEIGHT),
      trackFillEnabled: Colors.knobRimColorProperty,
      thumbFill: Colors.controlSurfaceColorProperty,
      thumbFillHighlighted: Colors.controlSurfaceColorProperty,
      thumbStroke: Colors.knobRimColorProperty,
      majorTickStroke: Colors.axisColorProperty,
      thumbCenterLineStroke: Colors.controlSurfaceTextColorProperty,
    });
    sampleNames.forEach((name, index) => {
      sampleSlider.addMajorTick(index, instrumentText(name, { font: labLabelFont }));
    });
    const chosenSampleProperty = DerivedProperty.deriveAny(
      [model.sampleProperty, ...sampleNames],
      () => sampleLabels[model.sampleProperty.value].value,
    );
    const chopper = numericKnob(
      model.chopperFrequencyProperty,
      model.chopperFrequencyProperty.range,
      lab.chopperSpeedStringProperty,
      names.chopperSpeedStringProperty,
      instrumentStrings.units.hertzStringProperty,
      (value) => value,
      1,
      settings.CHOPPER_KNOB_STEPS,
    );
    const trimR = numericKnob(
      model.strainTrimProperty,
      model.strainTrimProperty.range,
      lab.strainTrimStringProperty,
      names.strainTrimStringProperty,
      lab.microstrainStringProperty,
      (value) => value * 1e6,
      1,
      settings.STRAIN_KNOB_STEPS,
    );
    const trimC = numericKnob(
      model.capacitanceTrimProperty,
      model.capacitanceTrimProperty.range,
      lab.capacitanceTrimStringProperty,
      names.capacitanceTrimStringProperty,
      lab.picofaradsStringProperty,
      (value) => value * 1e12,
      1,
      settings.CAPACITANCE_KNOB_STEPS,
    );
    const low = settings.DEFAULTS.bridge.density;
    const normal = settings.DEFAULTS.choppedLight.density;
    const noise = dial(
      model.noiseDensityProperty,
      [
        { value: low, stringProperty: lab.noiseLowStringProperty },
        { value: normal, stringProperty: lab.noiseNormalStringProperty },
        { value: settings.HIGH_NOISE_DENSITY, stringProperty: lab.noiseHighStringProperty },
      ],
      lab.noiseStringProperty,
      names.noiseStringProperty,
    );

    const light = new HBox({
      spacing: layout.INSET,
      visibleProperty: is("choppedLight"),
      children: [
        chopper,
        new VBox({
          spacing: layout.SECTION_GAP,
          children: [instrumentText(lab.sampleStringProperty, { font: labLabelFont }), sampleSlider],
        }),
      ],
    });
    const bridge = new HBox({ spacing: layout.INSET, visibleProperty: is("bridge"), children: [trimR, trimC] });
    const controls = new HBox({
      spacing: layout.SECTION_GAP,
      children: [noise, new Node({ children: [light, bridge] })],
    });
    const art = new Node({
      visibleProperty: showingDrawingProperty,
      children: [
        new Rectangle(0, 0, width, layout.APPARATUS_DRAWING_HEIGHT, {
          fill: Colors.chartBackgroundColorProperty,
          stroke: Colors.chartBorderColorProperty,
          cornerRadius: layout.KEY_RADIUS,
        }),
        new Node({
          visibleProperty: is("choppedLight"),
          children: [lightDrawing(this.blade, chosenSampleProperty, model.scenarios.choppedLight.backgroundIntensity)],
        }),
        new Node({ visibleProperty: is("bridge"), children: [bridgeDrawing(this.cantilever)] }),
        new Node({ visibleProperty: is("rcFilter"), children: [rcDrawing()] }),
      ],
    });
    const hintProperty = DerivedProperty.deriveAny(
      [scenario, ...Object.values(hints)],
      () => hints[scenario.value].value,
    );
    const instruction = new RichText(hintProperty, {
      font: labLabelFont,
      fill: Colors.mutedTextColorProperty,
      lineWrap: width,
    });
    this.scope = new ScopeChartNode({ input: model.scopeInput }, model.scopePhase, {
      width,
      height: layout.SCOPE_HEIGHT,
      title: lab.scopeStringProperty,
      compact: true,
      xTitle: instrumentStrings.charts.timeMsStringProperty,
      yUnit: instrumentStrings.charts.voltageStringProperty,
      windowProperty: scopeWindow,
      accessibleDescription: labA11y.scopeStringProperty,
      traces: [
        { key: "input", color: Colors.inputTraceColorProperty, label: instrumentStrings.charts.inputStringProperty },
      ],
      clippingRangeProperty: model.inputRangeProperty,
    });
    const drawingAndHint = new VBox({
      spacing: layout.COMPACT_GAP,
      align: "left",
      visibleProperty: showingDrawingProperty,
      children: [art, instruction],
    });
    this.scopeVisibleProperty.link((visible) => {
      this.scope.visible = visible;
    });
    const stage = new AlignBox(new Node({ children: [drawingAndHint, this.scope] }), {
      preferredWidth: width,
      preferredHeight: layout.SCOPE_HEIGHT,
      xAlign: "left",
      yAlign: "top",
    });
    const body = new VBox({
      align: "left",
      spacing: layout.COMPACT_GAP,
      children: [
        new HBox({
          spacing: layout.SECTION_GAP,
          children: [instrumentText(lab.experimentStringProperty, { font: labHeadingFont }), choose, scopeToggle],
        }),
        stage,
        controls,
      ],
    });
    this.children = [new LockInAmplifierPanel(body, { xMargin: layout.INSET, yMargin: layout.INSET })];
    this.signalPort.centerX = this.localBounds.maxX - layout.APPARATUS_SIGNAL_PORT_INSET;
    this.syncPort.centerX = this.localBounds.maxX - layout.APPARATUS_SYNC_PORT_INSET;
    this.signalPort.centerY = this.localBounds.maxY - layout.INSET;
    this.syncPort.centerY = this.signalPort.centerY;
    this.addChild(this.signalPort);
    this.addChild(this.syncPort);
    this.pdomOrder = [choose, scopeToggle, this.scope, controls];
    this.update(0);
  }

  public reset(): void {
    this.scopeVisibleProperty.reset();
  }

  public update(dt: number): void {
    if (this.model.scenarioProperty.value === "choppedLight") {
      this.blade.rotation = this.model.chopperAngle;
    }
    if (this.model.scenarioProperty.value === "bridge") {
      const x = drawing.CANTILEVER_X;
      const y = drawing.CANTILEVER_Y;
      const length = drawing.CANTILEVER_LENGTH;
      const bend = this.model.scenarios.bridge.hiddenParameters.strain * drawing.STRAIN_VISUAL_GAIN;
      this.cantilever.shape = new Shape().moveTo(x, y).quadraticCurveTo(x + length / 2, y, x + length, y + bend);
    }
    this.scope.step(dt);
  }
}
