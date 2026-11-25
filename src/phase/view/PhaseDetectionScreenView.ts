/** Output geometry, signal and reference controls, and a common time history. */
import { DerivedProperty, Multilink, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, AlignGroup, GridBox, HBox, Node, Path, RichText, VBox } from "scenerystack/scenery";
import { PlayPauseButton, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { ABSwitch, RectangularPushButton } from "scenerystack/sun";
import {
  FLAT_BUTTON_APPEARANCE_OPTIONS,
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/LockInAmplifierButtonOptions.js";
import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { instrumentCheckbox } from "../../common/view/instrumentControls.js";
import { bindInstrumentAction } from "../../common/view/instrumentKeyboard.js";
import {
  chartLabelFont,
  formatValue,
  instrumentFont,
  instrumentHeadingFont,
  instrumentStrings,
  instrumentText,
  valueStringProperty,
} from "../../common/view/instrumentText.js";
import { LockInAmplifierNumberControl } from "../../common/view/LockInAmplifierNumberControl.js";
import { ReadoutRow } from "../../common/view/ReadoutRow.js";
import { SlopeRadioButtonGroup } from "../../common/view/SlopeRadioButtonGroup.js";
import { StripChartNode } from "../../common/view/StripChartNode.js";
import { TimeConstantControl } from "../../common/view/TimeConstantControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  CHART_SETTINGS,
  P3_LAYOUT_SETTINGS as layout,
  PHASE_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { PhaseDetectionModel } from "../model/PhaseDetectionModel.js";
import { PhaseDetectionScreenSummaryContent } from "./PhaseDetectionScreenSummaryContent.js";
import { PhasorPlane } from "./PhasorPlane.js";
import { RotaryKnob } from "./RotaryKnob.js";

const { phase: strings, charts, controls, units } = instrumentStrings;
const a11y = StringManager.getInstance().getPhaseDetectionA11yStrings();
const degreesPerRadian = 1 / settings.PHASE_STEP;

export class PhaseDetectionScreenView extends ScreenView {
  private readonly plane: PhasorPlane;
  private readonly strip: StripChartNode;

  public constructor(model: PhaseDetectionModel, options?: ScreenViewOptions) {
    super({ ...options, screenSummaryContent: new PhaseDetectionScreenSummaryContent(model) });
    const bounds = this.layoutBounds;
    const left = bounds.left + layout.MARGIN;
    const top = bounds.top + layout.MARGIN;
    const right = bounds.right - layout.MARGIN;
    const bottom = bounds.bottom - layout.MARGIN;
    const plotWidth = bounds.width - 2 * layout.MARGIN - layout.GAP - settings.CONTROL_WIDTH;
    const dualProperty = new DerivedProperty([model.modeProperty], (setting) => setting === "dual");
    const canShowSignalProperty = new DerivedProperty([model.hidePhaseProperty], (hidden) => !hidden);
    const showFrameProperty = new DerivedProperty(
      [canShowSignalProperty, model.showSignalFrameProperty],
      (visible, show) => visible && show,
    );
    this.plane = new PhasorPlane(model, dualProperty);
    const stripTitleProperty = new DerivedProperty(
      [dualProperty, strings.dualHistoryStringProperty, strings.singleHistoryStringProperty],
      (showBoth, many, one) => (showBoth ? many : one),
    );
    this.strip = new StripChartNode(model.xHistory, {
      width: plotWidth,
      height: settings.STRIP_HEIGHT,
      title: stripTitleProperty,
      xTitle: charts.timeSecondsStringProperty,
      yUnit: charts.voltageStringProperty,
      color: Colors.outputTraceColorProperty,
      windowProperty: new NumberProperty(settings.STRIP_SECONDS),
      minimumSpan: () => model.amplitudeProperty.value,
      additionalChannels: [
        { history: model.yHistory, color: Colors.quadratureTraceColorProperty, visibleProperty: dualProperty },
        { history: model.rHistory, color: Colors.productTraceColorProperty, visibleProperty: dualProperty },
      ],
      accessibleDescription: new DerivedProperty(
        [dualProperty, a11y.stripStringProperty, a11y.stripSingleStringProperty],
        (dual, many, one) => (dual ? many : one),
      ),
    });
    const noteWidth = plotWidth - this.plane.width - layout.GAP - 2 * layout.PANEL_INSET;
    const heading = (label: TReadOnlyProperty<string>) => instrumentText(label, { font: instrumentHeadingFont });
    const identityProperty = new DerivedProperty(
      [model.detuneProperty, strings.identityStringProperty, strings.detunedIdentityStringProperty],
      (offset, locked, unlocked) => (offset === 0 ? locked : unlocked),
    );
    const note = (label: TReadOnlyProperty<string>, visibleProperty?: TReadOnlyProperty<boolean>) =>
      instrumentText(label, { maxWidth: noteWidth, ...(visibleProperty ? { visibleProperty } : {}) });
    const legend = new GridBox({
      rows: [
        [
          instrumentText(strings.xStringProperty, { fill: Colors.outputTraceColorProperty }),
          note(strings.xLegendStringProperty),
        ],
        [
          instrumentText(strings.yStringProperty, { fill: Colors.quadratureTraceColorProperty }),
          note(strings.yLegendStringProperty),
        ],
        [
          instrumentText(strings.rStringProperty, { fill: Colors.productTraceColorProperty }),
          note(strings.rLegendStringProperty),
        ],
      ],
      xAlign: "left",
      xSpacing: layout.CONTENT_GAP,
      ySpacing: layout.ROW_GAP,
    });
    legend.visibleProperty = dualProperty;
    const singleNoteProperty = new DerivedProperty([dualProperty], (isDual) => !isDual);
    const singleNote = new RichText(strings.singleNoteStringProperty, {
      font: instrumentFont,
      fill: Colors.mutedTextColorProperty,
      lineWrap: noteWidth,
      visibleProperty: singleNoteProperty,
    });
    const frameToggle = instrumentCheckbox(
      model.showSignalFrameProperty,
      strings.showFrameStringProperty,
      a11y.controls.showFrameStringProperty,
    );
    frameToggle.enabledProperty = canShowSignalProperty;
    const frame = this.createSignalFrame(model, showFrameProperty);
    const signalPhase = new LockInAmplifierNumberControl(
      strings.signalPhaseStringProperty,
      model.signalPhaseProperty,
      model.signalPhaseProperty.range,
      units.degreesStringProperty,
      {
        decimals: 0,
        multiplier: degreesPerRadian,
        delta: settings.PHASE_STEP,
        accessibleName: a11y.controls.signalPhaseStringProperty,
      },
    );
    const side = new LockInAmplifierPanel(
      new VBox({
        align: "left",
        spacing: layout.SECTION_GAP,
        excludeInvisibleChildrenFromBounds: false,
        children: [
          heading(strings.projectionStringProperty),
          note(identityProperty),
          new RichText(strings.detuneNoteStringProperty, {
            font: instrumentFont,
            fill: Colors.mutedTextColorProperty,
            lineWrap: noteWidth,
          }),
          new AlignBox(new VBox({ children: [legend, singleNote] }), { xAlign: "left" }),
          frameToggle,
          new AlignBox(frame, { preferredWidth: noteWidth, preferredHeight: settings.FRAME_HEIGHT, xAlign: "left" }),
        ],
      }),
      { xMargin: layout.PANEL_INSET, minHeight: settings.PLANE_HEIGHT },
    );
    const plotColumn = new VBox({
      left,
      top,
      align: "left",
      spacing: layout.GAP,
      children: [new HBox({ spacing: layout.GAP, align: "top", children: [this.plane, side] }), this.strip],
    });

    const reference = new RotaryKnob(
      model.referencePhaseProperty,
      a11y.controls.referencePhaseStringProperty,
      a11y.controls.knobHelpStringProperty,
    );
    const referenceValue = valueStringProperty(
      model.referencePhaseProperty,
      units.degreesStringProperty,
      0,
      degreesPerRadian,
    );
    const applyAutoPhase = () => {
      model.autoPhase();
      autoPhase.addAccessibleResponse(
        StringUtils.fillIn(a11y.autoPhaseResultStringProperty.value, {
          phase: formatValue(
            units.degreesStringProperty.value,
            model.referencePhaseProperty.value * degreesPerRadian,
            1,
          ),
          y: formatValue(units.millivoltsStringProperty.value, model.yProperty.value * 1000, 1),
        }),
      );
    };
    const autoPhase = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: instrumentText(strings.autoPhaseStringProperty, { fill: LIGHT_SURFACE_TEXT_FILL }),
      accessibleName: a11y.controls.autoPhaseStringProperty,
      listener: applyAutoPhase,
    });
    bindInstrumentAction(autoPhase, keys.autoPhase, applyAutoPhase);
    const mode = new ABSwitch(
      model.modeProperty,
      "single",
      instrumentText(strings.singleStringProperty),
      "dual",
      instrumentText(strings.dualStringProperty),
      {
        toggleSwitchOptions: {
          thumbFill: Colors.controlSurfaceColorProperty,
          thumbStroke: Colors.axisColorProperty,
          trackStroke: Colors.axisColorProperty,
          trackFillLeft: Colors.badgeBackgroundColorProperty,
          trackFillRight: Colors.selectedBlockColorProperty,
        },
        valueAAccessibleName: a11y.controls.singleStringProperty,
        valueBAccessibleName: a11y.controls.dualStringProperty,
      },
    );
    const output = (
      label: TReadOnlyProperty<string>,
      value: TReadOnlyProperty<number>,
      unit: TReadOnlyProperty<string> = units.millivoltsStringProperty,
      multiplier = 1000,
      show = true,
    ) => {
      const row = new ReadoutRow(
        label,
        valueStringProperty(value, unit, 1, multiplier),
        settings.READOUT_WIDTH,
        settings.READOUT_BADGE_WIDTH,
      );
      if (!show) {
        row.visibleProperty = dualProperty;
      }
      return row;
    };
    const readouts = new GridBox({
      rows: [
        [
          output(strings.xStringProperty, model.xProperty),
          output(strings.rStringProperty, model.rProperty, units.millivoltsStringProperty, 1000, false),
        ],
        [
          output(strings.yStringProperty, model.yProperty, units.millivoltsStringProperty, 1000, false),
          output(
            strings.thetaStringProperty,
            model.thetaProperty,
            units.degreesStringProperty,
            degreesPerRadian,
            false,
          ),
        ],
      ],
      xSpacing: layout.ROW_GAP,
      ySpacing: layout.ROW_GAP,
      excludeInvisibleChildrenFromBounds: false,
    });
    const hide = instrumentCheckbox(
      model.hidePhaseProperty,
      strings.hidePhaseStringProperty,
      a11y.controls.hidePhaseStringProperty,
    );
    const amplitude = new LockInAmplifierNumberControl(
      controls.amplitudeStringProperty,
      model.amplitudeProperty,
      model.amplitudeProperty.range,
      units.voltsStringProperty,
      { decimals: 3, delta: layout.CONTROL_DELTA, accessibleName: a11y.controls.amplitudeStringProperty },
    );
    signalPhase.visibleProperty = canShowSignalProperty;
    const detune = new LockInAmplifierNumberControl(
      strings.detuneStringProperty,
      model.detuneProperty,
      model.detuneProperty.range,
      units.hertzStringProperty,
      { decimals: 2, delta: settings.DETUNE_STEP, accessibleName: a11y.controls.detuneStringProperty },
    );
    const density = new LockInAmplifierNumberControl(
      controls.densityStringProperty,
      model.densityProperty,
      model.densityProperty.range,
      units.densityStringProperty,
      { decimals: 1, multiplier: 1000, accessibleName: a11y.controls.densityStringProperty },
    );
    const time = new TimeConstantControl(model.timeConstantProperty, a11y.controls.timeConstantStringProperty);
    const slope = new SlopeRadioButtonGroup(model.orderProperty, a11y.controls.slopeStringProperty);
    const group = new AlignGroup({ matchVertical: false });
    const stack = (children: Node[]) =>
      group.createBox(
        new LockInAmplifierPanel(
          new VBox({
            align: "left",
            spacing: layout.CONTENT_GAP,
            excludeInvisibleChildrenFromBounds: false,
            children,
          }),
          { minWidth: settings.CONTROL_WIDTH, xMargin: layout.PANEL_INSET },
        ),
      );
    const panels = new VBox({
      align: "right",
      right,
      top,
      spacing: layout.GAP,
      children: [
        stack([
          new HBox({ spacing: layout.GAP, children: [heading(strings.detectorStringProperty), mode] }),
          readouts,
          new HBox({
            spacing: layout.SECTION_GAP,
            children: [
              reference,
              new VBox({
                align: "left",
                spacing: layout.ROW_GAP,
                children: [
                  instrumentText(strings.referencePhaseStringProperty),
                  instrumentText(referenceValue, { font: chartLabelFont }),
                ],
              }),
              autoPhase,
            ],
          }),
        ]),
        stack([heading(controls.inputHeadingStringProperty), amplitude, hide, signalPhase]),
        stack([heading(controls.filterStringProperty), detune, time, slope, density]),
      ],
    });
    const play = new PlayPauseButton(model.timer.isPlayingProperty, {
      ...FLAT_BUTTON_APPEARANCE_OPTIONS,
      radius: layout.PLAY_RADIUS,
      left,
      bottom,
    });
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      radius: layout.RESET_RADIUS,
      right,
      bottom,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
      },
    });
    this.children = [plotColumn, panels, play, reset, new Node({ pdomOrder: [plotColumn, panels, play, reset] })];
  }

  private createSignalFrame(model: PhaseDetectionModel, visible: TReadOnlyProperty<boolean>): Node {
    const radius = settings.FRAME_RADIUS;
    const reference = new Path(null, {
      stroke: Colors.referenceTraceColorProperty,
      lineWidth: CHART_SETTINGS.GUIDE_WIDTH,
      lineDash: [...CHART_SETTINGS.DASH],
    });
    const signal = new Path(new Shape().moveTo(-radius, 0).lineTo(radius, 0), {
      stroke: Colors.axisColorProperty,
      lineWidth: CHART_SETTINGS.GUIDE_WIDTH,
    });
    const dial = new Path(new Shape().circle(0, 0, radius), { stroke: Colors.gridColorProperty });
    Multilink.multilink([model.signalFrameAngleProperty, visible], (angle, shown) => {
      if (!shown) {
        return;
      }
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      reference.shape = new Shape().moveTo(-x, -y).lineTo(x, y);
    });
    return new HBox({
      visibleProperty: visible,
      spacing: layout.CONTENT_GAP,
      children: [
        new Node({ children: [dial, signal, reference] }),
        new VBox({
          spacing: layout.ROW_GAP,
          align: "left",
          children: [
            instrumentText(strings.signalAxisStringProperty, { font: chartLabelFont }),
            instrumentText(strings.referenceAxisStringProperty, {
              font: chartLabelFont,
              fill: Colors.referenceTraceColorProperty,
            }),
          ],
        }),
      ],
    });
  }

  public override step(dt: number): void {
    this.plane.step(dt);
    this.strip.step(dt);
  }
}
