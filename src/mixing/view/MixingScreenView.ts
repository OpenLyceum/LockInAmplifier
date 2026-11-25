/** Probe-aligned Mixing views with a persistent strip chart of the filtered output. */
import { BooleanProperty, DerivedProperty, NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, AlignGroup, GridBox, HBox, Node, VBox } from "scenerystack/scenery";
import { PlayPauseButton, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  FLAT_BUTTON_APPEARANCE_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/LockInAmplifierButtonOptions.js";
import { LockInAmplifierPanel } from "../../common/LockInAmplifierPanel.js";
import { BlockDiagramNode, Probe } from "../../common/view/BlockDiagramNode.js";
import {
  controlRow,
  instrumentCheckbox,
  instrumentCombo,
  numberChoices,
} from "../../common/view/instrumentControls.js";
import {
  chartLabelFont,
  instrumentHeadingFont,
  instrumentStrings,
  instrumentText,
  valueStringProperty,
} from "../../common/view/instrumentText.js";
import { LockInAmplifierNumberControl } from "../../common/view/LockInAmplifierNumberControl.js";
import { ReadoutRow } from "../../common/view/ReadoutRow.js";
import { ScopeChartNode } from "../../common/view/ScopeChartNode.js";
import { SlopeRadioButtonGroup } from "../../common/view/SlopeRadioButtonGroup.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StripChartNode } from "../../common/view/StripChartNode.js";
import { TimeConstantControl } from "../../common/view/TimeConstantControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  CHART_SETTINGS,
  CONTROL_SETTINGS,
  P2_LAYOUT_SETTINGS as layout,
  MIXING_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { MixingModel } from "../model/MixingModel.js";
import { MixingScreenSummaryContent } from "./MixingScreenSummaryContent.js";
import { ProbeSpectrum } from "./ProbeSpectrum.js";

const { charts, controls, units } = instrumentStrings;
const a11y = StringManager.getInstance().getMixingA11yStrings();
const stages = [
  {
    key: "input",
    probe: Probe.INPUT,
    title: charts.inputStringProperty,
    color: Colors.inputTraceColorProperty,
    unit: charts.voltageStringProperty,
  },
  {
    key: "reference",
    probe: Probe.REFERENCE,
    title: charts.referenceStringProperty,
    color: Colors.referenceTraceColorProperty,
    unit: charts.referenceUnitStringProperty,
  },
  {
    key: "product",
    probe: Probe.PRODUCT,
    title: charts.productStringProperty,
    color: Colors.productTraceColorProperty,
    unit: charts.voltageStringProperty,
  },
  {
    key: "output",
    probe: Probe.OUTPUT,
    title: charts.outputStringProperty,
    color: Colors.outputTraceColorProperty,
    unit: charts.voltageStringProperty,
  },
] as const;

export class MixingScreenView extends ScreenView {
  private readonly strip: StripChartNode;
  private readonly scopes: readonly ScopeChartNode<keyof MixingModel["traces"]>[];
  private readonly spectra: readonly SpectrumChartNode[];
  private readonly showSpectraProperty = new BooleanProperty(false);

  public constructor(model: MixingModel, providedOptions?: ScreenViewOptions) {
    super(
      optionize<ScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
        {
          screenSummaryContent: new MixingScreenSummaryContent(model),
        },
        providedOptions,
      ),
    );
    const bounds = this.layoutBounds;
    const left = bounds.left + layout.MARGIN;
    const top = bounds.top + layout.MARGIN;
    const right = bounds.right - layout.MARGIN;
    const totalWidth = bounds.width - 2 * layout.MARGIN;
    const plotWidth = totalWidth - layout.CONTROL_WIDTH - layout.GAP;
    const bottom = bounds.bottom - layout.MARGIN;
    const probeProperty = new Property<Probe>(Probe.PRODUCT, {
      validValues: [Probe.INPUT, Probe.REFERENCE, Probe.PRODUCT, Probe.FILTER, Probe.OUTPUT],
    });
    const diagram = new BlockDiagramNode(probeProperty, totalWidth);
    diagram.left = left;
    diagram.top = top;
    const windowProperty = new NumberProperty(CHART_SETTINGS.SCOPE_WINDOWS[1], {
      validValues: [...CHART_SETTINGS.SCOPE_WINDOWS],
    });
    const stripWindowProperty = new NumberProperty(settings.STRIP_WINDOW);
    const differenceProperty = new DerivedProperty([model.effectiveReferenceProperty], (frequency) =>
      Math.abs(settings.FREQUENCY - frequency),
    );
    const sumProperty = new DerivedProperty(
      [model.effectiveReferenceProperty],
      (frequency) => settings.FREQUENCY + frequency,
    );

    const plotGroup = new AlignGroup({ matchVertical: false });
    const scopes: ScopeChartNode<keyof MixingModel["traces"]>[] = [];
    const spectra: SpectrumChartNode[] = [];
    const plotRows = stages.map((stage) => {
      const last = stage.key === "output";
      const spectrumSource = new ProbeSpectrum();
      const geometry = {
        width: plotWidth,
        height: last ? layout.MIXING_LAST_TRACE_HEIGHT : layout.MIXING_TRACE_HEIGHT,
        title: stage.title,
        compact: true,
        showXAxis: last,
      };
      const scope = new ScopeChartNode(model.traces, model.phaseHistory, {
        ...geometry,
        xTitle: charts.timeMsStringProperty,
        yUnit: stage.unit,
        accessibleDescription: new DerivedProperty([a11y.scopeStringProperty, stage.title], (pattern, title) =>
          StringUtils.fillIn(pattern, { stage: title }),
        ),
        windowProperty,
        traces: [{ key: stage.key, color: stage.color, label: stage.title }],
        ...(stage.key === "product" ? { mean: () => model.productMean } : {}),
      });
      const differencePeak = {
        frequency: () => differenceProperty.value,
        pattern: charts.differencePeakStringProperty,
        dcLabel: charts.dcDifferencePeakStringProperty,
      };
      const peaks = {
        input: [
          { frequency: () => (model.amplitudeProperty.value > 0 ? settings.FREQUENCY : null) },
          { frequency: () => (model.thirdHarmonicProperty.value ? 3 * settings.FREQUENCY : null) },
        ],
        reference: [{ frequency: () => model.effectiveReferenceProperty.value }],
        product: [differencePeak, { frequency: () => sumProperty.value, pattern: charts.sumPeakStringProperty }],
        output: [differencePeak],
      };
      const spectrum = new SpectrumChartNode({
        ...geometry,
        xTitle: charts.frequencyHzStringProperty,
        yUnit: stage.key === "reference" ? charts.decibelGainStringProperty : charts.levelDbVoltsStringProperty,
        color: stage.color,
        accessibleDescription: new DerivedProperty([a11y.spectrumStringProperty, stage.title], (pattern, title) =>
          StringUtils.fillIn(pattern, { stage: title }),
        ),
        magnitudes: () => spectrumSource.compute(model.traces[stage.key]),
        dcMagnitude: () => spectrumSource.dc,
        ...(stage.key === "reference" || stage.key === "input" ? { reference: model.effectiveReferenceProperty } : {}),
        peaks: peaks[stage.key],
      });
      this.showSpectraProperty.link((show) => {
        scope.visible = !show;
        spectrum.visible = show;
      });
      probeProperty.link((probe) => {
        const selected = probe === stage.probe || (last && probe === Probe.FILTER);
        scope.setHighlighted(selected, stage.color);
        spectrum.setHighlighted(selected, stage.color);
      });
      scopes.push(scope);
      spectra.push(spectrum);
      return plotGroup.createBox(new Node({ children: [scope, spectrum] }), { yAlign: "top" });
    });
    this.scopes = scopes;
    this.spectra = spectra;
    const identityLabelProperty = new DerivedProperty(
      [model.waveformProperty, controls.identityStringProperty, controls.harmonicNoteStringProperty],
      (waveformValue, sineIdentity, squareNote) => (waveformValue === "sine" ? sineIdentity : squareNote),
    );
    const identity = new LockInAmplifierPanel(
      new HBox({
        spacing: layout.GAP,
        children: [
          new AlignBox(
            instrumentText(identityLabelProperty, { maxWidth: plotWidth * layout.IDENTITY_COLUMN_FRACTION }),
            {
              preferredWidth: plotWidth * layout.IDENTITY_COLUMN_FRACTION,
              xAlign: "left",
            },
          ),
          new VBox({
            align: "left",
            spacing: layout.TRACE_SPACING,
            children: [
              new ReadoutRow(
                controls.differenceStringProperty,
                valueStringProperty(differenceProperty, units.hertzStringProperty, 1),
                plotWidth * layout.IDENTITY_COLUMN_FRACTION,
              ),
              new ReadoutRow(
                controls.sumStringProperty,
                valueStringProperty(sumProperty, units.hertzStringProperty, 1),
                plotWidth * layout.IDENTITY_COLUMN_FRACTION,
              ),
            ],
          }),
        ],
      }),
      {
        minWidth: plotWidth,
        minHeight: layout.MIXING_IDENTITY_HEIGHT,
        xMargin: CONTROL_SETTINGS.ACCORDION_MARGIN,
        yMargin: CONTROL_SETTINGS.FIELD_INSET,
        stroke: Colors.chartBorderColorProperty,
      },
    );
    const plots = new VBox({
      align: "left",
      spacing: layout.TRACE_SPACING,
      children: [...plotRows, identity],
      left,
      top: diagram.bottom + layout.GAP,
    });

    const popupLayer = new Node();
    const waveform = instrumentCombo(
      model.waveformProperty,
      [
        { value: "sine", labelProperty: controls.sineStringProperty },
        { value: "square", labelProperty: controls.squareStringProperty },
      ],
      popupLayer,
      a11y.controls.waveformStringProperty,
      "above",
    );
    const referenceFrequency = new LockInAmplifierNumberControl(
      controls.refFrequencyStringProperty,
      model.referenceFrequencyProperty,
      new Range(...settings.REFERENCE_RANGE),
      units.hertzStringProperty,
      {
        accessibleName: a11y.controls.refFrequencyStringProperty,
        decimals: 0,
        delta: settings.REFERENCE_STEP,
        includeArrowButtons: true,
      },
    );
    model.lockedProperty.link((locked) => {
      referenceFrequency.enabled = !locked;
    });
    const lockedFrequencyProperty = new DerivedProperty(
      [model.lockedProperty, model.effectiveReferenceProperty, units.hertzStringProperty],
      (locked, frequency, pattern) => (locked ? StringUtils.fillIn(pattern, { value: frequency }) : ""),
    );
    const referenceControls = new VBox({
      align: "left",
      spacing: layout.MIXING_CONTROL_SPACING,
      children: [
        instrumentText(controls.referenceHeadingStringProperty, { font: instrumentHeadingFont }),
        new HBox({
          spacing: layout.GAP,
          children: [
            instrumentCheckbox(model.lockedProperty, controls.lockStringProperty, a11y.controls.lockStringProperty),
            instrumentText(lockedFrequencyProperty, { font: chartLabelFont, fill: Colors.referenceTraceColorProperty }),
          ],
        }),
        referenceFrequency,
        new LockInAmplifierNumberControl(
          controls.phaseStringProperty,
          model.phaseProperty,
          new Range(...settings.PHASE_RANGE),
          units.degreesStringProperty,
          {
            accessibleName: a11y.controls.phaseStringProperty,
            multiplier: 180 / Math.PI,
            decimals: 0,
            delta: settings.PHASE_STEP,
          },
        ),
        controlRow(controls.waveformStringProperty, waveform),
      ],
    });
    const inputControls = new VBox({
      align: "left",
      spacing: layout.MIXING_CONTROL_SPACING,
      children: [
        instrumentText(controls.inputHeadingStringProperty, { font: instrumentHeadingFont }),
        new LockInAmplifierNumberControl(
          controls.amplitudeStringProperty,
          model.amplitudeProperty,
          new Range(...settings.AMPLITUDE_RANGE),
          units.voltsStringProperty,
          {
            accessibleName: a11y.controls.amplitudeStringProperty,
            decimals: 2,
          },
        ),
        instrumentCheckbox(
          model.thirdHarmonicProperty,
          controls.thirdStringProperty,
          a11y.controls.thirdStringProperty,
        ),
        instrumentCheckbox(
          model.noiseEnabledProperty,
          controls.mixNoiseStringProperty,
          a11y.controls.mixNoiseStringProperty,
        ),
      ],
    });
    const filterControls = new VBox({
      align: "left",
      spacing: layout.MIXING_CONTROL_SPACING,
      children: [
        instrumentText(controls.filterStringProperty, { font: instrumentHeadingFont }),
        new TimeConstantControl(model.timeConstantProperty, a11y.controls.timeConstantStringProperty),
        new SlopeRadioButtonGroup(model.orderProperty, a11y.controls.slopeStringProperty),
      ],
    });
    const settingsPanel = new LockInAmplifierPanel(
      new VBox({
        align: "left",
        spacing: layout.GAP,
        children: [referenceControls, inputControls, filterControls],
      }),
      {
        minWidth: layout.CONTROL_WIDTH,
        xMargin: CONTROL_SETTINGS.ACCORDION_MARGIN,
        stroke: Colors.chartBorderColorProperty,
      },
    );
    this.strip = new StripChartNode(model.outputHistory, {
      width: layout.CONTROL_WIDTH,
      height: layout.MIXING_STRIP_HEIGHT,
      title: charts.outputHistoryStringProperty,
      xTitle: charts.timeSecondsStringProperty,
      yUnit: charts.voltageStringProperty,
      accessibleDescription: a11y.stripStringProperty,
      color: Colors.outputTraceColorProperty,
      windowProperty: stripWindowProperty,
      minimumSpan: () => model.amplitudeProperty.value / 2,
      readingProperty: valueStringProperty(model.outputProperty, charts.latestStringProperty, 3),
    });
    const controlsColumn = new VBox({
      align: "right",
      spacing: layout.GAP,
      children: [this.strip, settingsPanel],
      right,
      top: diagram.bottom + layout.GAP,
    });
    const window = instrumentCombo(
      windowProperty,
      numberChoices(CHART_SETTINGS.SCOPE_WINDOWS, units.millisecondsStringProperty, (seconds) => 1000 * seconds),
      popupLayer,
      a11y.controls.windowStringProperty,
      "above",
    );
    window.enabledProperty = new DerivedProperty([this.showSpectraProperty], (show) => !show);
    const displayControls = new HBox({
      spacing: layout.GAP * 2,
      children: [
        instrumentCheckbox(
          this.showSpectraProperty,
          controls.showSpectraStringProperty,
          a11y.controls.showSpectraStringProperty,
        ),
        controlRow(charts.windowStringProperty, window),
      ],
      left,
      bottom,
    });
    const playPause = new PlayPauseButton(model.timer.isPlayingProperty, {
      ...FLAT_BUTTON_APPEARANCE_OPTIONS,
      radius: layout.PLAY_RADIUS,
    });
    const reset = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      radius: layout.RESET_RADIUS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        this.showSpectraProperty.reset();
        windowProperty.reset();
        probeProperty.reset();
      },
    });
    const transport = new GridBox({
      rows: [[playPause, reset]],
      xSpacing: layout.GAP,
      right,
      bottom,
    });
    this.addChild(diagram);
    this.addChild(plots);
    this.addChild(controlsColumn);
    this.addChild(displayControls);
    this.addChild(transport);
    this.addChild(popupLayer);
    this.addChild(new Node({ pdomOrder: [diagram, plots, displayControls, controlsColumn, transport, popupLayer] }));
  }

  public override step(dt: number): void {
    const plots = this.showSpectraProperty.value ? this.spectra : this.scopes;
    for (const plot of plots) {
      plot.step(dt);
    }
    this.strip.step(dt);
  }
}
