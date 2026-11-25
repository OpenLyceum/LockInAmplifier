/** A bench lock-in with detented switches, live centre-zero meters and dedicated action keys. */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { clamp } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, AlignGroup, Circle, HBox, HStrut, Line, Node, Rectangle, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Utterance } from "scenerystack/utterance-queue";
import { PanelButton } from "../../common/controls/PanelButton.js";
import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { DisposalBag } from "../../common/view/DisposalBag.js";
import { numberChoices } from "../../common/view/instrumentControls.js";
import { bindInstrumentAction } from "../../common/view/instrumentKeyboard.js";
import { formatValue, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  FILTER_SETTINGS,
  LAB_LAYOUT_SETTINGS as layout,
  LAB_INSTRUMENT_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { VirtualExperimentModel } from "../model/VirtualExperimentModel.js";
import { dial, numericKnob } from "./labControls.js";
import { lab, labA11y, labHeadingFont, labLabelFont, voltageDetents, voltageReadout } from "./labText.js";

const units = instrumentStrings.units;
const names = labA11y.controls;
const degreesPerRadian = 180 / Math.PI;
const displayFont = new PhetFont({ size: layout.DISPLAY_FONT_SIZE, family: "monospace", weight: "bold" });

function led(label: TReadOnlyProperty<string>, on: TReadOnlyProperty<boolean>): Node {
  const off = new Circle(layout.INDICATOR_RADIUS, { fill: Colors.ledOffColorProperty });
  const lit = new Circle(layout.INDICATOR_RADIUS, {
    fill: Colors.labWarningColorProperty,
    visibleProperty: on,
  });
  return new HBox({
    spacing: layout.COMPACT_GAP,
    children: [
      new Node({ children: [off, lit] }),
      instrumentText(label, { font: labLabelFont, fill: Colors.mutedTextColorProperty }),
    ],
  });
}

class ChannelDisplay extends Node {
  private readonly value = instrumentText(units.unavailableStringProperty.value, {
    font: displayFont,
    fill: Colors.labReadoutColorProperty,
    maxWidth: layout.DISPLAY_WIDTH - layout.INSET,
  });
  private readonly bar: Rectangle;
  private readonly valueBox: AlignBox;
  private readonly centre = layout.METER_WIDTH / 2;

  public constructor(label: TReadOnlyProperty<string>) {
    super();
    this.valueBox = new AlignBox(this.value, {
      preferredWidth: layout.DISPLAY_WIDTH,
      preferredHeight: layout.DISPLAY_HEIGHT,
    });
    const face = new Rectangle(0, 0, layout.DISPLAY_WIDTH, layout.DISPLAY_HEIGHT, {
      cornerRadius: layout.KEY_RADIUS,
      fill: Colors.chartBackgroundColorProperty,
      stroke: Colors.knobRimColorProperty,
    });
    const baseline = new Rectangle(0, 0, layout.METER_WIDTH, layout.METER_HEIGHT, {
      cornerRadius: layout.KEY_RADIUS,
      fill: Colors.chartBackgroundColorProperty,
      stroke: Colors.knobRimColorProperty,
    });
    this.bar = new Rectangle(this.centre, 0, 0, layout.METER_HEIGHT, { fill: Colors.labReadoutColorProperty });
    const zero = new Line(this.centre, -2, this.centre, layout.METER_HEIGHT + 2, {
      stroke: Colors.axisColorProperty,
    });
    this.children = [
      new VBox({
        spacing: layout.COMPACT_GAP,
        children: [
          instrumentText(label, { font: labLabelFont, fill: Colors.mutedTextColorProperty }),
          new Node({ children: [face, this.valueBox] }),
          new Node({ children: [baseline, this.bar, zero] }),
        ],
      }),
    ];
  }

  public update(value: number, scale: number, angle: boolean, valid: boolean): void {
    const fraction = valid ? clamp(value / (angle ? Math.PI : scale), -1, 1) : 0;
    const end = this.centre * (1 + fraction);
    this.bar.setRect(Math.min(this.centre, end), 0, Math.abs(end - this.centre), layout.METER_HEIGHT);
    const text = valid
      ? angle
        ? formatValue(units.degreesStringProperty.value, value * degreesPerRadian, 2)
        : voltageReadout(value, scale)
      : units.unavailableStringProperty.value;
    if (this.value.string !== text) {
      this.value.string = text;
    }
  }
}

function jack(label: TReadOnlyProperty<string>, reference: boolean): Node {
  const color = reference ? Colors.referenceTraceColorProperty : Colors.inputTraceColorProperty;
  const marker = new Circle(layout.CONNECTOR_RADIUS, {
    fill: Colors.chartBackgroundColorProperty,
    stroke: color,
    lineWidth: layout.CABLE_WIDTH,
  });
  return new HBox({
    spacing: layout.COMPACT_GAP,
    children: [marker, instrumentText(label, { font: labLabelFont, fill: color })],
  });
}

export class LockInFrontPanelNode extends Node {
  private readonly first = new ChannelDisplay(lab.ch1StringProperty);
  private readonly second = new ChannelDisplay(lab.ch2StringProperty);
  public readonly signalJack = jack(lab.inputJackStringProperty, false);
  public readonly referenceJack = jack(lab.referenceJackStringProperty, true);

  private readonly model: VirtualExperimentModel;

  public constructor(model: VirtualExperimentModel) {
    super();
    this.model = model;
    const outputOverloadProperty = new DerivedProperty(
      [model.timer.timeProperty, model.sensitivityProperty, model.referenceUnlockProperty],
      (_time, scale, unlock) => !unlock && Math.abs(model.demodulator.x) > scale,
    );
    const rows = new AlignGroup({ matchHorizontal: false });
    const group = (title: TReadOnlyProperty<string>, width: number, children: Node[]) =>
      new LockInAmplifierPanel(
        rows.createBox(
          new VBox({
            spacing: layout.COMPACT_GAP,
            children: [
              new HStrut(width),
              instrumentText(title, { font: labHeadingFont, fill: Colors.mutedTextColorProperty }),
              ...children,
            ],
          }),
          { yAlign: "top", preferredWidth: width },
        ),
        { xMargin: 0, yMargin: layout.COMPACT_GAP, fill: Colors.panelBackgroundColorProperty },
      );
    const withDials = (...children: Node[]) => new HBox({ spacing: layout.KNOB_GAP, children });
    const key = (
      label: TReadOnlyProperty<string>,
      accessibleName: TReadOnlyProperty<string>,
      listener: () => void,
      enabledProperty?: TReadOnlyProperty<boolean>,
    ) =>
      new PanelButton({
        labelStringProperty: label,
        accessibleName,
        listener,
        ...(enabledProperty ? { enabledProperty } : {}),
      });
    const availableProperty = new DerivedProperty(
      [model.referenceUnlockProperty, model.timer.timeProperty],
      (unlock, time) => !unlock && time > 0,
    );
    const recordEnabledProperty = new DerivedProperty(
      [availableProperty, model.rowsProperty],
      (valid, entries) => valid && entries.length < settings.MAX_ROWS,
    );
    const internalProperty = new DerivedProperty([model.reference.lockedProperty], (external) => !external);
    const syncReadoutProperty = new DerivedProperty(
      [model.reference.lockedProperty, model.chopperFrequencyProperty, lab.linkedFrequencyStringProperty],
      (external, hz, pattern) => (external ? formatValue(pattern, hz, 1, true) : ""),
    );
    const sensitivity = dial(
      model.sensitivityProperty,
      voltageDetents(settings.SENSITIVITIES),
      lab.sensitivityStringProperty,
      names.sensitivityStringProperty,
    );
    const range = dial(
      model.inputRangeProperty,
      voltageDetents(settings.INPUT_RANGES),
      lab.inputRangeStringProperty,
      names.inputRangeStringProperty,
    );
    const source = dial(
      model.reference.lockedProperty,
      [
        { value: false, stringProperty: lab.internalStringProperty },
        { value: true, stringProperty: lab.externalStringProperty },
      ],
      lab.sourceStringProperty,
      names.sourceStringProperty,
      model.externalAvailableProperty,
    );
    const frequency = numericKnob(
      model.internalFrequencyLogProperty,
      model.internalFrequencyLogProperty.range,
      lab.frequencyStringProperty,
      names.frequencyStringProperty,
      units.hertzStringProperty,
      (value) => 10 ** value,
      2,
      settings.REFERENCE_KNOB_STEPS,
      internalProperty,
      names.frequencyHelpStringProperty,
    );
    const phase = numericKnob(
      model.phaseProperty,
      model.phaseProperty.range,
      lab.phaseStringProperty,
      names.phaseStringProperty,
      units.degreesStringProperty,
      (value) => value * degreesPerRadian,
      1,
      settings.PHASE_KNOB_STEPS,
    );
    const harmonic = dial(
      model.harmonicProperty,
      [
        { value: 1, stringProperty: lab.oneFStringProperty },
        { value: 2, stringProperty: lab.twoFStringProperty },
        { value: 3, stringProperty: lab.threeFStringProperty },
      ],
      lab.harmonicStringProperty,
      names.harmonicStringProperty,
    );
    const tau = dial(
      model.timeConstantProperty,
      numberChoices(FILTER_SETTINGS.TIME_CONSTANTS, units.secondsStringProperty, (value) => value, 3).map(
        ({ value, labelProperty }) => ({ value, stringProperty: labelProperty }),
      ),
      lab.timeConstantStringProperty,
      names.timeConstantStringProperty,
    );
    const slopes = Object.values(FILTER_SETTINGS.ORDERS).map((value) => ({
      value,
      stringProperty: new DerivedProperty([units.slopeStringProperty], (pattern) =>
        formatValue(pattern, value * FILTER_SETTINGS.DB_PER_OCTAVE_PER_POLE, 0),
      ),
    }));
    const slope = dial(model.filterOrderProperty, slopes, lab.slopeStringProperty, names.slopeStringProperty);
    const firstDisplay = dial(
      model.firstDisplayProperty,
      [
        { value: "x", stringProperty: lab.xStringProperty },
        { value: "r", stringProperty: lab.rStringProperty },
      ],
      lab.displayStringProperty,
      names.firstDisplayStringProperty,
      undefined,
      layout.DISPLAY_KNOB_RADIUS,
    );
    const secondDisplay = dial(
      model.secondDisplayProperty,
      [
        { value: "y", stringProperty: lab.yStringProperty },
        { value: "theta", stringProperty: lab.thetaStringProperty },
      ],
      lab.displayStringProperty,
      names.secondDisplayStringProperty,
      undefined,
      layout.DISPLAY_KNOB_RADIUS,
    );

    const applyAutoPhase = () => {
      model.autoPhase();
      autoPhase.addAccessibleResponse(
        StringUtils.fillIn(labA11y.autoPhaseResultStringProperty.value, {
          phase: formatValue(units.degreesStringProperty.value, model.phaseProperty.value * degreesPerRadian, 1),
        }),
      );
    };
    const autoPhase = key(
      lab.autoPhaseStringProperty,
      names.autoPhaseStringProperty,
      applyAutoPhase,
      availableProperty,
    );
    bindInstrumentAction(autoPhase, keys.autoPhase, applyAutoPhase);
    const autoRange = key(
      lab.autoRangeStringProperty,
      names.autoRangeStringProperty,
      () => model.autoRange(),
      availableProperty,
    );
    const recordRow = () => {
      const count = model.rowsProperty.value.length;
      model.record();
      if (model.rowsProperty.value.length > count) {
        record.addAccessibleResponse(StringUtils.fillIn(labA11y.rowRecordedStringProperty.value, { count: count + 1 }));
      }
    };
    const record = key(lab.recordStringProperty, names.recordStringProperty, recordRow, recordEnabledProperty);
    bindInstrumentAction(record, keys.record, recordRow);

    const responses = new DisposalBag();
    const announceOverload = (
      property: TReadOnlyProperty<boolean>,
      active: TReadOnlyProperty<string>,
      cleared: TReadOnlyProperty<string>,
    ) => {
      const on = new Utterance({ alert: active });
      const off = new Utterance({ alert: cleared });
      responses.own(on, off);
      responses.lazyLink(property, (overload) => this.addAccessibleResponse(overload ? on : off));
    };
    announceOverload(
      model.inputOverloadProperty,
      labA11y.inputOverloadStringProperty,
      labA11y.inputClearedStringProperty,
    );
    announceOverload(outputOverloadProperty, labA11y.outputOverloadStringProperty, labA11y.outputClearedStringProperty);
    this.disposeEmitter.addListener(() => responses.dispose());

    const [inputWidth, referenceWidth, filterWidth, displayWidth] = layout.FRONT_SECTION_WIDTHS;
    const inputGroup = group(lab.inputStringProperty, inputWidth, [
      withDials(sensitivity, range),
      led(lab.inputOverloadStringProperty, model.inputOverloadProperty),
      autoRange,
    ]);
    const referenceGroup = group(lab.referenceStringProperty, referenceWidth, [
      withDials(source, frequency, phase, harmonic),
      new HBox({
        spacing: layout.SECTION_GAP,
        children: [
          led(lab.refUnlockStringProperty, model.referenceUnlockProperty),
          new AlignBox(
            instrumentText(syncReadoutProperty, { font: labLabelFont, fill: Colors.referenceTraceColorProperty }),
            {
              preferredWidth: layout.TABLE_SETTING_WIDTH,
            },
          ),
        ],
      }),
      autoPhase,
    ]);
    const filterGroup = group(lab.filterStringProperty, filterWidth, [withDials(tau, slope)]);
    const makeChannel = (readout: ChannelDisplay, selection: Node) =>
      new VBox({
        spacing: layout.COMPACT_GAP,
        children: [readout, selection],
      });
    const displayGroup = group(lab.displayStringProperty, displayWidth, [
      new HBox({
        spacing: layout.COMPACT_GAP,
        children: [makeChannel(this.first, firstDisplay), makeChannel(this.second, secondDisplay)],
      }),
      led(lab.outputOverloadStringProperty, outputOverloadProperty),
      record,
    ]);
    const header = new HBox({
      spacing: layout.SECTION_GAP,
      children: [
        instrumentText(lab.instrumentStringProperty, { font: labHeadingFont }),
        new HStrut(layout.FRONT_SECTION_WIDTHS[0] / 2),
        this.signalJack,
        this.referenceJack,
      ],
    });
    this.children = [
      new LockInAmplifierPanel(
        new VBox({
          spacing: layout.COMPACT_GAP,
          align: "left",
          children: [
            header,
            new HBox({
              spacing: layout.COMPACT_GAP,
              children: [inputGroup, referenceGroup, filterGroup, displayGroup],
            }),
          ],
        }),
        { xMargin: layout.INSET, yMargin: layout.COMPACT_GAP, fill: Colors.labFaceColorProperty },
      ),
    ];
    this.pdomOrder = [
      sensitivity,
      range,
      autoRange,
      source,
      frequency,
      phase,
      harmonic,
      autoPhase,
      tau,
      slope,
      firstDisplay,
      secondDisplay,
      record,
    ];
    this.update();
  }

  public update(): void {
    const model = this.model;
    const valid = !model.referenceUnlockProperty.value;
    const scale = model.sensitivityProperty.value;
    const first = model.firstDisplayProperty.value;
    const second = model.secondDisplayProperty.value;
    this.first.update(model.demodulator[first], scale, false, valid);
    this.second.update(model.demodulator[second], scale, second === "theta", valid);
  }
}
