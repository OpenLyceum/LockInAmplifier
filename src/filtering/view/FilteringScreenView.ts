/** Four coordinated views of how the low-pass filter trades noise for response time. */
import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignGroup, HBox, Node, RichText, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { RectangularPushButton } from "scenerystack/sun";
import { Utterance } from "scenerystack/utterance-queue";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/LockInAmplifierButtonOptions.js";
import { LockInAmplifierHotkeyData as keys } from "../../common/LockInAmplifierHotkeyData.js";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { type FilterOrder, predictedOutputNoise } from "../../common/model/LockInMath.js";
import { DisposalBag } from "../../common/view/DisposalBag.js";
import { instrumentCombo, numberChoices } from "../../common/view/instrumentControls.js";
import { bindInstrumentAction } from "../../common/view/instrumentKeyboard.js";
import {
  chartLabelFont,
  formatValue,
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
  FILTERING_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { FilteringModel } from "../model/FilteringModel.js";
import { BodePlot, HistogramNode, NoiseScalingPlot } from "./FilteringPlots.js";
import { FilteringScreenSummaryContent } from "./FilteringScreenSummaryContent.js";

const { filtering: strings, charts, controls, units } = instrumentStrings;
const a11y = StringManager.getInstance().getFilteringA11yStrings();

export class FilteringScreenView extends ScreenView {
  private readonly strip: StripChartNode;
  private readonly histogram: HistogramNode;
  private readonly voltageRange: TReadOnlyProperty<Range>;
  private readonly bag = new DisposalBag();

  public constructor(model: FilteringModel, options?: ScreenViewOptions) {
    super({ ...options, screenSummaryContent: new FilteringScreenSummaryContent(model) });
    const bounds = this.layoutBounds;
    const left = bounds.left + layout.MARGIN;
    const top = bounds.top + layout.MARGIN;
    const right = bounds.right - layout.MARGIN;
    const bottom = bounds.bottom - layout.MARGIN;
    const width = bounds.width - 2 * layout.MARGIN - layout.GAP - settings.CONTROL_WIDTH;
    const chartWidth = (width - layout.GAP) / 2;
    const windowProperty = new NumberProperty(settings.DEFAULT_STRIP_WINDOW, {
      validValues: [...CHART_SETTINGS.STRIP_WINDOWS],
    });
    const popupLayer = new Node();
    const windowChoices = numberChoices(CHART_SETTINGS.STRIP_WINDOWS, units.secondsStringProperty);
    const windowCombo = instrumentCombo(windowProperty, windowChoices, popupLayer, a11y.controls.windowStringProperty);
    const stripWidth = width - settings.HISTOGRAM_WIDTH - layout.GAP;
    const windowControl = new HBox({
      spacing: layout.ROW_GAP,
      right: left + stripWidth - CHART_SETTINGS.RIGHT,
      centerY: top + CHART_SETTINGS.TOP / 2,
      children: [instrumentText(charts.windowStringProperty, { font: chartLabelFont }), windowCombo],
    });
    this.bag.own(windowProperty, ...windowChoices.map(({ labelProperty }) => labelProperty), popupLayer, windowCombo);
    // Preserve the scale for longer τ so a narrower noise band remains obvious on screen.
    const rangeProperty = new DerivedProperty(
      [model.amplitudeProperty, model.densityProperty, model.timeConstantProperty, model.orderProperty],
      (amplitude, density, tau, order) => {
        const spread =
          settings.PREDICTION_SIGMAS *
          predictedOutputNoise(density, Math.min(tau, settings.TIME_CONSTANT), order as FilterOrder);
        const minimum = Math.min(-settings.RANGE_TICK, amplitude - spread);
        const maximum = Math.max(settings.RANGE_TICK, amplitude + spread);
        const tick = settings.RANGE_TICK;
        return new Range(Math.floor(minimum / tick) * tick, Math.ceil(maximum / tick) * tick);
      },
      { valueComparisonStrategy: "equalsFunction" },
    );
    this.voltageRange = rangeProperty;
    this.strip = new StripChartNode(model.history, {
      width: stripWidth,
      height: settings.TOP_HEIGHT,
      title: strings.stripStringProperty,
      xTitle: charts.timeSecondsStringProperty,
      yUnit: charts.voltageStringProperty,
      color: Colors.outputTraceColorProperty,
      windowProperty,
      statistics: () => (model.hasStatistics ? model.statistics : null),
      predicted: model.amplitudeProperty,
      predictedSigma: model.predictedSigmaProperty,
      yRange: () => this.voltageRange.value,
      eventAge: () =>
        model.stepTimeProperty.value === null ? null : model.timer.timeProperty.value - model.stepTimeProperty.value,
      accessibleDescription: a11y.stripStringProperty,
    });
    this.histogram = new HistogramNode(model);
    const chartGrid = new VBox({
      align: "left",
      spacing: layout.GAP,
      left,
      top,
      children: [
        new HBox({ spacing: layout.GAP, children: [this.strip, this.histogram] }),
        new HBox({
          spacing: layout.GAP,
          children: [new BodePlot(model, chartWidth), new NoiseScalingPlot(model, chartWidth)],
        }),
      ],
    });
    const time = new TimeConstantControl(model.timeConstantProperty, a11y.controls.timeConstantStringProperty);
    const slope = new SlopeRadioButtonGroup(model.orderProperty, a11y.controls.slopeStringProperty);
    const amplitudeControl = new LockInAmplifierNumberControl(
      controls.amplitudeStringProperty,
      model.amplitudeProperty,
      model.amplitudeProperty.range,
      units.voltsStringProperty,
      { decimals: 3, delta: layout.CONTROL_DELTA, accessibleName: a11y.controls.amplitudeStringProperty },
    );
    const densityControl = new LockInAmplifierNumberControl(
      controls.densityStringProperty,
      model.densityProperty,
      model.densityProperty.range,
      units.densityStringProperty,
      { decimals: 1, multiplier: 1000, accessibleName: a11y.controls.densityStringProperty },
    );
    const action = (label: TReadOnlyProperty<string>, name: TReadOnlyProperty<string>, listener: () => void) =>
      new RectangularPushButton({
        ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
        accessibleName: name,
        listener,
        content: instrumentText(label, { fill: LIGHT_SURFACE_TEXT_FILL }),
      });
    let stepPending = false;
    const startStep = () => {
      model.applyStep();
      stepPending = true;
    };
    const step = action(strings.stepStringProperty, a11y.controls.stepStringProperty, startStep);
    const settledResponse = new Utterance({ alert: a11y.stepSettledStringProperty });
    this.bag.own(settledResponse);
    this.bag.lazyLink(model.timer.timeProperty, (elapsed) => {
      const start = model.stepTimeProperty.value;
      if (stepPending && start !== null && elapsed >= start + model.settlingTimeProperty.value) {
        stepPending = false;
        step.addAccessibleResponse(settledResponse);
      }
    });
    bindInstrumentAction(step, keys.step, startStep);

    const recordSigma = () => {
      const count = model.measurementsProperty.value.length;
      model.recordSigma();
      if (model.measurementsProperty.value.length > count) {
        record.addAccessibleResponse(
          StringUtils.fillIn(a11y.sigmaRecordedStringProperty.value, {
            sigma: formatValue(units.millivoltsStringProperty.value, model.measuredSigmaProperty.value * 1000, 2),
          }),
        );
      }
    };
    const record = action(strings.recordStringProperty, a11y.controls.recordStringProperty, recordSigma);
    bindInstrumentAction(record, keys.record, recordSigma);
    const collectingProperty = new DerivedProperty(
      [model.measurementProgressProperty, strings.collectingStringProperty],
      (progress, pattern) => StringUtils.fillIn(pattern, { percent: Math.floor(progress * 100) }),
    );
    const collecting = instrumentText(collectingProperty, {
      font: chartLabelFont,
      fill: Colors.mutedTextColorProperty,
      accessibleParagraph: collectingProperty,
    });
    this.bag.own(collectingProperty, collecting);
    this.bag.link(model.measurementProgressProperty, (progress) => {
      record.enabled = progress === 1;
      collecting.visible = progress < 1;
    });
    const clear = action(strings.clearStringProperty, a11y.controls.clearStringProperty, () =>
      model.clearMeasurements(),
    );
    this.bag.link(model.measurementsProperty, (measurements) => {
      clear.enabled = measurements.length > 0;
    });
    const panelContents = settings.CONTROL_WIDTH - 2 * layout.PANEL_INSET;
    const readout = (
      label: TReadOnlyProperty<string>,
      value: TReadOnlyProperty<number>,
      unit: TReadOnlyProperty<string>,
      decimals: number,
      multiplier = 1,
    ) => new ReadoutRow(label, valueStringProperty(value, unit, decimals, multiplier), panelContents);
    const heading = (label: TReadOnlyProperty<string>) =>
      instrumentText(label, { font: instrumentHeadingFont, maxWidth: panelContents });
    const countProperty = new DerivedProperty(
      [model.measurementsProperty, strings.recordCountStringProperty],
      (measurements, pattern) => StringUtils.fillIn(pattern, { count: measurements.length }),
    );
    const group = new AlignGroup({ matchVertical: false });
    const panels = new VBox({
      spacing: layout.GAP,
      right,
      top,
      align: "right",
      children: [
        group.createBox(
          new LockInAmplifierPanel(
            new VBox({
              spacing: layout.CONTENT_GAP,
              align: "left",
              children: [
                heading(strings.filterHeadingStringProperty),
                time,
                slope,
                amplitudeControl,
                densityControl,
                new HBox({
                  spacing: layout.ROW_GAP,
                  excludeInvisibleChildrenFromBounds: false,
                  children: [step, record, collecting, clear],
                }),
                instrumentText(countProperty, { font: chartLabelFont, fill: Colors.mutedTextColorProperty }),
              ],
            }),
            { minWidth: settings.CONTROL_WIDTH, xMargin: layout.PANEL_INSET },
          ),
        ),
        group.createBox(
          new LockInAmplifierPanel(
            new VBox({
              spacing: layout.ROW_GAP,
              align: "left",
              children: [
                heading(strings.readoutsStringProperty),
                readout(strings.enbwStringProperty, model.enbwProperty, units.hertzStringProperty, 3),
                readout(strings.cutoffStringProperty, model.cutoffProperty, units.hertzStringProperty, 3),
                readout(strings.settlingStringProperty, model.settlingTimeProperty, units.secondsStringProperty, 3),
                readout(
                  strings.predictedStringProperty,
                  model.predictedSigmaProperty,
                  units.millivoltsStringProperty,
                  2,
                  1000,
                ),
                readout(
                  strings.measuredStringProperty,
                  model.measuredSigmaProperty,
                  units.millivoltsStringProperty,
                  2,
                  1000,
                ),
                readout(strings.snrStringProperty, model.snrProperty, units.numberStringProperty, 1),
                instrumentText(strings.measuredKeyStringProperty, {
                  font: chartLabelFont,
                  fill: Colors.mutedTextColorProperty,
                  maxWidth: panelContents,
                }),
                instrumentText(strings.predictedKeyStringProperty, {
                  font: chartLabelFont,
                  fill: Colors.guideColorProperty,
                  maxWidth: panelContents,
                }),
              ],
            }),
            { minWidth: settings.CONTROL_WIDTH, xMargin: layout.PANEL_INSET },
          ),
        ),
      ],
    });
    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: [...model.timer.timeSpeeds],
      flowBoxSpacing: layout.GAP,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        includeStepForwardButton: false,
        playPauseButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.playPauseButtonOptions,
          radius: layout.PLAY_RADIUS,
        },
      },
      speedRadioButtonGroupOptions: {
        ...TIME_CONTROL_SPEED_RADIO_OPTIONS.speedRadioButtonGroupOptions,
        spacing: layout.ROW_GAP,
        accessibleHelpText: a11y.controls.speedHelpStringProperty,
        radioButtonOptions: {
          selectedColor: Colors.accentColorProperty,
          deselectedColor: Colors.controlSurfaceColorProperty,
          centerColor: Colors.backgroundColorProperty,
          stroke: Colors.axisColorProperty,
        },
      },
    });
    const footer = new HBox({
      left,
      bottom,
      spacing: layout.SECTION_GAP,
      children: [
        timeControl,
        new RichText(strings.tradeoffStringProperty, {
          font: chartLabelFont,
          fill: Colors.textColorProperty,
          lineWrap: settings.FOOTER_NOTE_WIDTH,
          accessibleParagraph: strings.tradeoffStringProperty,
        }),
      ],
    });
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      radius: layout.RESET_RADIUS,
      right,
      bottom,
      listener: () => {
        this.interruptSubtreeInput();
        stepPending = false;
        model.reset();
        windowProperty.reset();
      },
    });
    this.children = [
      chartGrid,
      windowControl,
      panels,
      footer,
      reset,
      popupLayer,
      new Node({ pdomOrder: [chartGrid, windowControl, panels, footer, reset, popupLayer] }),
    ];
  }

  public override step(dt: number): void {
    this.strip.step(dt);
    this.histogram.step(dt, this.voltageRange.value);
  }

  public override dispose(): void {
    this.bag.dispose();
    super.dispose();
  }
}
