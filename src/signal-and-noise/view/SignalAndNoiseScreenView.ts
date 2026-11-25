/** Time and frequency views of the same noisy input, with a right-hand instrument panel. */
import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignGroup, GridBox, HBox, Node, RichText, VBox } from "scenerystack/scenery";
import { PlayPauseButton, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  FLAT_BUTTON_APPEARANCE_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/LockInAmplifierButtonOptions.js";
import {
  controlRow,
  instrumentAccordion,
  instrumentCheckbox,
  instrumentCombo,
  numberChoices,
} from "../../common/view/instrumentControls.js";
import {
  chartLabelFont,
  formatValue,
  instrumentStrings,
  instrumentText,
  valueStringProperty,
} from "../../common/view/instrumentText.js";
import { LockInAmplifierNumberControl } from "../../common/view/LockInAmplifierNumberControl.js";
import { ReadoutRow } from "../../common/view/ReadoutRow.js";
import { ScopeChartNode } from "../../common/view/ScopeChartNode.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  CHART_SETTINGS,
  CONTROL_SETTINGS,
  P2_LAYOUT_SETTINGS as layout,
  NOISE_SETTINGS,
  SAMPLING_SETTINGS,
  SPECTRUM_SETTINGS,
  SIGNAL_NOISE_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { SignalAndNoiseModel } from "../model/SignalAndNoiseModel.js";
import { SignalAndNoiseScreenSummaryContent } from "./SignalAndNoiseScreenSummaryContent.js";

const { charts, controls, units } = instrumentStrings;
const a11y = StringManager.getInstance().getSignalAndNoiseA11yStrings();
const [, defaultWindow] = CHART_SETTINGS.SCOPE_WINDOWS;

export class SignalAndNoiseScreenView extends ScreenView {
  private readonly scope: ScopeChartNode<"input" | "signal">;
  private readonly spectrum: SpectrumChartNode;

  public constructor(model: SignalAndNoiseModel, providedOptions?: ScreenViewOptions) {
    super(
      optionize<ScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
        {
          screenSummaryContent: new SignalAndNoiseScreenSummaryContent(model),
        },
        providedOptions,
      ),
    );
    const bounds = this.layoutBounds;
    const left = bounds.left + layout.MARGIN;
    const top = bounds.top + layout.MARGIN;
    const width = bounds.width - 2 * layout.MARGIN - layout.GAP - layout.CONTROL_WIDTH;
    const right = bounds.right - layout.MARGIN;
    const windowProperty = new NumberProperty(defaultWindow, { validValues: [...CHART_SETTINGS.SCOPE_WINDOWS] });
    this.scope = new ScopeChartNode(model.traces, model.phaseHistory, {
      width,
      height: layout.SIGNAL_SCOPE_HEIGHT,
      title: charts.scopeStringProperty,
      xTitle: charts.timeMsStringProperty,
      yUnit: charts.voltageStringProperty,
      accessibleDescription: new DerivedProperty(
        [model.showSignalProperty, a11y.scopeStringProperty, a11y.scopeCleanStringProperty],
        (shown, raw, clean) => (shown ? clean : raw),
      ),
      windowProperty,
      showLegend: true,
      traces: [
        { key: "input", color: Colors.inputTraceColorProperty, label: charts.inputStringProperty },
        {
          key: "signal",
          color: Colors.cleanTraceColorProperty,
          label: charts.cleanStringProperty,
          visibleProperty: model.showSignalProperty,
        },
      ],
    });
    this.spectrum = new SpectrumChartNode({
      width,
      height: layout.SIGNAL_SPECTRUM_HEIGHT,
      title: charts.spectrumStringProperty,
      xTitle: charts.frequencyHzStringProperty,
      yUnit: charts.decibelVoltsStringProperty,
      accessibleDescription: new DerivedProperty(
        [
          model.showBandProperty,
          model.frequencyProperty,
          a11y.spectrumStringProperty,
          a11y.spectrumBandStringProperty,
          units.hertzStringProperty,
        ],
        (shown, frequency, spectrum, band, hz) =>
          shown ? StringUtils.fillIn(band, { frequency: formatValue(hz, frequency, 0) }) : spectrum,
      ),
      color: Colors.inputTraceColorProperty,
      magnitudes: () => model.spectrumMagnitudes,
      band: {
        frequencyProperty: model.frequencyProperty,
        bandwidthProperty: model.bandwidthProperty,
        visibleProperty: model.showBandProperty,
      },
      peaks: [
        { frequency: () => (model.amplitudeProperty.value > 0 ? model.frequencyProperty.value : null) },
        { frequency: () => (model.mainsAmplitudeProperty.value > 0 ? model.mainsFrequency : null) },
        { frequency: () => (model.mainsAmplitudeProperty.value > 0 ? 3 * model.mainsFrequency : null) },
      ],
      waitingMessage: true,
      calculateNoiseFloor: true,
    });
    const rmsWidth = (width - 3 * layout.GAP) / 4;
    const readoutGroup = new AlignGroup();
    const bandSnr = new ReadoutRow(
      controls.bandSnrStringProperty,
      valueStringProperty(model.bandSnrProperty, units.decibelsStringProperty, 1),
      rmsWidth,
      layout.RMS_BADGE_WIDTH,
    );
    model.showBandProperty.link((visible) => {
      bandSnr.opacity = visible ? 1 : 0;
      bandSnr.pdomVisible = visible;
    });
    const measurements = new HBox({
      children: [
        new ReadoutRow(
          controls.signalRmsStringProperty,
          valueStringProperty(model.signalRmsProperty, units.millivoltsStringProperty, 1, 1000),
          rmsWidth,
          layout.RMS_BADGE_WIDTH,
        ),
        new ReadoutRow(
          controls.noiseRmsStringProperty,
          valueStringProperty(model.noiseRmsProperty, units.millivoltsStringProperty, 1, 1000),
          rmsWidth,
          layout.RMS_BADGE_WIDTH,
        ),
        new ReadoutRow(
          controls.wideSnrStringProperty,
          valueStringProperty(model.wideSnrProperty, units.decibelsStringProperty, 1),
          rmsWidth,
          layout.RMS_BADGE_WIDTH,
        ),
        bandSnr,
      ].map((row) => readoutGroup.createBox(row)),
      spacing: layout.GAP,
      excludeInvisibleChildrenFromBounds: false,
    });
    const plots = new VBox({
      align: "left",
      spacing: layout.GAP,
      children: [this.scope, this.spectrum, measurements],
      left,
      top,
    });

    const popupLayer = new Node();
    const signalPanel = instrumentAccordion(
      controls.signalStringProperty,
      new VBox({
        align: "left",
        spacing: layout.SIGNAL_CONTROL_SPACING,
        children: [
          new LockInAmplifierNumberControl(
            controls.amplitudeStringProperty,
            model.amplitudeProperty,
            new Range(...settings.AMPLITUDE_RANGE),
            units.voltsStringProperty,
            {
              decimals: 3,
              delta: 0.005,
              accessibleName: a11y.controls.amplitudeStringProperty,
            },
          ),
          new LockInAmplifierNumberControl(
            controls.frequencyStringProperty,
            model.frequencyProperty,
            new Range(...settings.FREQUENCY_RANGE),
            units.hertzStringProperty,
            {
              logarithmic: true,
              decimals: 0,
              accessibleName: a11y.controls.frequencyStringProperty,
            },
          ),
          instrumentCheckbox(
            model.showSignalProperty,
            controls.showSignalStringProperty,
            a11y.controls.showSignalStringProperty,
          ),
        ],
      }),
    );
    const pinkChoices = numberChoices(
      Object.values(NOISE_SETTINGS.PINK_CORNERS).filter((value) => value > 0),
      units.hertzStringProperty,
    );
    const pinkCombo = instrumentCombo(
      model.pinkCornerProperty,
      [{ value: NOISE_SETTINGS.PINK_CORNERS.OFF, labelProperty: controls.offStringProperty }, ...pinkChoices],
      popupLayer,
      a11y.controls.pinkStringProperty,
    );
    const noisePanel = instrumentAccordion(
      controls.noiseStringProperty,
      new VBox({
        align: "left",
        spacing: layout.SIGNAL_CONTROL_SPACING,
        children: [
          new LockInAmplifierNumberControl(
            controls.densityStringProperty,
            model.densityProperty,
            new Range(...settings.DENSITY_RANGE),
            units.densityStringProperty,
            {
              decimals: 1,
              multiplier: 1000,
              accessibleName: a11y.controls.densityStringProperty,
            },
          ),
          controlRow(controls.pinkStringProperty, pinkCombo),
          new LockInAmplifierNumberControl(
            controls.mainsStringProperty,
            model.mainsAmplitudeProperty,
            new Range(...settings.MAINS_RANGE),
            units.voltsStringProperty,
            {
              decimals: 2,
              accessibleName: a11y.controls.mainsStringProperty,
            },
          ),
          new RichText(controls.noiseNoteStringProperty, {
            font: chartLabelFont,
            fill: Colors.mutedTextColorProperty,
            lineWrap: layout.CONTROL_WIDTH - 2 * CONTROL_SETTINGS.ACCORDION_MARGIN,
            accessibleParagraph: controls.noiseNoteStringProperty,
          }),
        ],
      }),
    );
    const recordCombo = instrumentCombo(
      model.recordLengthProperty,
      numberChoices(
        SPECTRUM_SETTINGS.RECORD_LENGTHS,
        units.secondsStringProperty,
        (count) => count / SAMPLING_SETTINGS.SAMPLE_RATE,
        1,
      ),
      popupLayer,
      a11y.controls.recordStringProperty,
      "above",
    );
    const averagesCombo = instrumentCombo(
      model.averagesProperty,
      numberChoices(SPECTRUM_SETTINGS.AVERAGE_COUNTS, units.numberStringProperty),
      popupLayer,
      a11y.controls.averagesStringProperty,
      "above",
    );
    const bandwidth = new LockInAmplifierNumberControl(
      controls.bandwidthStringProperty,
      model.bandwidthProperty,
      new Range(...settings.BANDWIDTH_RANGE),
      units.hertzStringProperty,
      {
        logarithmic: true,
        decimals: 2,
        accessibleName: a11y.controls.bandwidthStringProperty,
        accessibleHelpText: a11y.controls.bandwidthHelpStringProperty,
      },
    );
    model.showBandProperty.link((visible) => {
      bandwidth.enabled = visible;
    });
    const rbwProperty = new DerivedProperty([model.recordLengthProperty], () => model.rbw);
    const recordCountProperty = new DerivedProperty(
      [model.averagedRecordsProperty, model.averagesProperty, charts.recordsStringProperty],
      (count, target, pattern) => StringUtils.fillIn(pattern, { count, target }),
    );
    const analysisPanel = instrumentAccordion(
      controls.analysisStringProperty,
      new VBox({
        align: "left",
        spacing: layout.SIGNAL_CONTROL_SPACING,
        children: [
          controlRow(controls.recordStringProperty, recordCombo),
          new HBox({
            spacing: layout.GAP,
            children: [
              controlRow(controls.averagesStringProperty, averagesCombo),
              instrumentText(recordCountProperty, { font: chartLabelFont, fill: Colors.mutedTextColorProperty }),
            ],
          }),
          new GridBox({
            rows: [
              [
                new ReadoutRow(
                  charts.rbwStringProperty,
                  valueStringProperty(rbwProperty, units.hertzStringProperty, 2),
                  layout.RBW_READOUT_WIDTH,
                ),
                new ReadoutRow(
                  charts.floorStringProperty,
                  valueStringProperty(this.spectrum.noiseFloorProperty, units.decibelVoltsStringProperty, 1),
                  layout.NOISE_FLOOR_READOUT_WIDTH,
                ),
              ],
            ],
            xSpacing: layout.GAP,
          }),
          instrumentCheckbox(
            model.showBandProperty,
            controls.showBandStringProperty,
            a11y.controls.showBandStringProperty,
          ),
          bandwidth,
        ],
      }),
    );
    const controlColumn = new VBox({
      align: "right",
      spacing: layout.GAP,
      children: [signalPanel, noisePanel, analysisPanel],
      top,
      right,
    });
    const timeWindow = instrumentCombo(
      windowProperty,
      numberChoices(CHART_SETTINGS.SCOPE_WINDOWS, units.millisecondsStringProperty, (seconds) => seconds * 1000),
      popupLayer,
      a11y.controls.windowStringProperty,
      "above",
    );
    const playPause = new PlayPauseButton(model.timer.isPlayingProperty, {
      ...FLAT_BUTTON_APPEARANCE_OPTIONS,
      radius: layout.PLAY_RADIUS,
    });
    const transport = new HBox({
      children: [playPause, controlRow(charts.windowStringProperty, timeWindow)],
      spacing: layout.GAP,
      left: controlColumn.left,
      bottom: bounds.bottom - layout.MARGIN,
    });
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      radius: layout.RESET_RADIUS,
      right,
      bottom: bounds.bottom - layout.MARGIN,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        signalPanel.reset();
        noisePanel.reset();
        analysisPanel.reset();
        windowProperty.reset();
      },
    });
    this.addChild(plots);
    this.addChild(controlColumn);
    this.addChild(transport);
    this.addChild(reset);
    this.addChild(popupLayer);
    this.addChild(new Node({ pdomOrder: [plots, controlColumn, transport, reset, popupLayer] }));
  }

  public override step(dt: number): void {
    this.scope.step(dt);
    this.spectrum.step(dt);
  }
}
