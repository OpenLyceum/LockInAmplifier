/** The distribution of X, the filter transfer function, and the noise scaling experiment. */
import { DerivedProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HBox, Node, Path, RichText, VBox } from "scenerystack/scenery";
import { cutoff3dB, type FilterOrder, magnitude, predictedOutputNoise } from "../../common/model/LockInMath.js";
import { niceTicks } from "../../common/view/axisScale.js";
import { ChartFrame } from "../../common/view/ChartFrame.js";
import { chartLabelFont, formatValue, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import { CHART_SETTINGS, FILTER_SETTINGS, FILTERING_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import type { FilteringModel } from "../model/FilteringModel.js";

const { filtering: strings } = instrumentStrings;
const a11y = StringManager.getInstance().getFilteringA11yStrings();
const frameWidth = CHART_SETTINGS.GRID_WIDTH;
const xTicks = (values: readonly number[], multiplier = 1) =>
  values.map((value) => ({ value: Math.log10(value), label: String(value * multiplier) }));
const orderColors = {
  1: Colors.inputTraceColorProperty,
  2: Colors.productTraceColorProperty,
  3: Colors.outputTraceColorProperty,
  4: Colors.referenceTraceColorProperty,
};

export class HistogramNode extends ChartFrame {
  private readonly bars = new Path(null, { fill: Colors.outputTraceColorProperty, opacity: 0.48 });
  private readonly gaussian = new Path(null, {
    stroke: Colors.guideColorProperty,
    lineWidth: CHART_SETTINGS.GUIDE_WIDTH,
  });
  private elapsed = Infinity;
  private axisRange: Range | null = null;
  private axisPercent = 0;

  private readonly model: FilteringModel;

  public constructor(model: FilteringModel) {
    super({
      width: settings.HISTOGRAM_WIDTH,
      height: settings.TOP_HEIGHT,
      title: strings.histogramStringProperty,
      xTitle: strings.binProbabilityStringProperty,
      showYTicks: false,
      plotLeft: CHART_SETTINGS.RIGHT,
      accessibleDescription: a11y.histogramStringProperty,
    });
    this.model = model;
    this.plot.children = [this.bars, this.gaussian];
    this.bag.own(this.bars, this.gaussian);
  }

  public step(dt: number, range: Range): void {
    this.elapsed += dt;
    if (range === this.axisRange && this.elapsed < 1 / CHART_SETTINGS.SPECTRUM_REDRAW_HZ) {
      return;
    }
    this.elapsed = 0;
    this.model.updateHistogram();
    const { bins, min, max } = this.model.histogram;
    const count = bins.reduce((sum, bin) => sum + bin, 0);
    const mean = this.model.amplitudeProperty.value;
    const sigma = this.model.predictedSigmaProperty.value;
    const binWidth = (max - min) / bins.length || (2 * settings.PREDICTION_SIGMAS * sigma) / bins.length;
    const gaussianPeak = sigma > 0 ? binWidth / (sigma * Math.sqrt(2 * Math.PI)) : 0;
    const peak = Math.max(gaussianPeak, count ? Math.max(...bins) / count : 0);
    const percent = Math.max(10, Math.ceil(peak * 10) * 10);
    if (range !== this.axisRange || percent !== this.axisPercent) {
      this.axisRange = range;
      this.axisPercent = percent;
      const horizontal = [0, percent / 2, percent];
      this.setAxes(
        new Range(0, percent / 100),
        range,
        horizontal.map((value) => ({ value: value / 100, label: String(value) })),
        niceTicks(range, CHART_SETTINGS.TIME_TICK_INTERVALS - 1),
      );
    }
    const bars = new Shape();
    if (count && this.model.hasStatistics) {
      bins.forEach((bin, index) => {
        const center = max === min ? min : min + (index + 0.5) * binWidth;
        const height = max === min ? frameWidth * 2 : (this.plotHeight * binWidth) / range.getLength();
        bars.rect(
          0,
          this.chartTransform.modelToViewY(center) - height / 2,
          this.chartTransform.modelToViewX(bin / count),
          height,
        );
      });
    }
    this.bars.shape = bars;
    const curve = new Shape();
    if (sigma > 0) {
      const span = settings.PREDICTION_SIGMAS + 1;
      for (let index = 0; index <= settings.GAUSSIAN_POINTS; index++) {
        const z = span * ((2 * index) / settings.GAUSSIAN_POINTS - 1);
        const x = this.chartTransform.modelToViewX(gaussianPeak * Math.exp(-(z ** 2) / 2));
        const y = this.chartTransform.modelToViewY(mean + z * sigma);
        if (index === 0) {
          curve.moveTo(x, y);
        } else {
          curve.lineTo(x, y);
        }
      }
    }
    this.gaussian.shape = curve;
  }
}

export class BodePlot extends ChartFrame {
  public constructor(model: FilteringModel, width: number) {
    super({
      width,
      height: settings.BOTTOM_HEIGHT,
      title: strings.bodeStringProperty,
      xTitle: instrumentStrings.charts.frequencyHzStringProperty,
      yUnit: instrumentStrings.charts.decibelGainStringProperty,
      accessibleDescription: a11y.bodeStringProperty,
      footerHeight: settings.POWER_INSET_FOOTER_HEIGHT,
    });
    const frequencyTicks = xTicks(settings.BODE_DECADES);
    const low = Math.log10(settings.BODE_DECADES[0]);
    const high = Math.log10(Math.max(...settings.BODE_DECADES));
    const bottom = settings.BODE_LEVELS[0];
    this.setAxes(
      new Range(low, high),
      new Range(bottom, 0),
      frequencyTicks,
      settings.BODE_LEVELS.map((value) => ({ value, label: String(value) })),
    );
    const response = new Path(null, { stroke: Colors.outputTraceColorProperty, lineWidth: CHART_SETTINGS.GUIDE_WIDTH });
    const cutoff = new Path(null, { stroke: Colors.guideColorProperty, lineDash: [...CHART_SETTINGS.DASH] });
    const dot = new Path(null, { fill: Colors.guideColorProperty });
    const cutoffLabel = instrumentText(strings.cutoffMarkerStringProperty, {
      font: chartLabelFont,
      fill: Colors.guideColorProperty,
    });
    const gap = CHART_SETTINGS.AXIS_LABEL_GAP;
    const insetWidth = settings.POWER_INSET_WIDTH;
    const insetHeight = settings.POWER_INSET_HEIGHT;
    const captionWidth = width - insetWidth - CHART_SETTINGS.LABEL_SIZE - 7 * gap;
    const powerFrequencyProperty = new DerivedProperty(
      [model.timeConstantProperty, strings.powerFrequencyStringProperty],
      (tau, pattern) => formatValue(pattern, 1 / tau, 2, true),
    );
    const bandwidthProperty = new DerivedProperty(
      [model.enbwProperty, strings.powerWidthStringProperty],
      (bandwidth, pattern) => formatValue(pattern, bandwidth, 3, true),
    );
    const captionOptions = {
      font: chartLabelFont,
      fill: Colors.mutedTextColorProperty,
    };
    const powerFrequency = instrumentText(powerFrequencyProperty, { ...captionOptions, maxWidth: insetWidth });
    const powerArea = new RichText(strings.powerAreaStringProperty, { ...captionOptions, lineWrap: captionWidth });
    const powerWidth = instrumentText(bandwidthProperty, { ...captionOptions, maxWidth: captionWidth });
    const caption = new VBox({
      children: [powerArea, powerWidth],
      align: "left",
      spacing: gap,
    });
    const insetBorder = new Path(new Shape().rect(0, 0, insetWidth, insetHeight), {
      stroke: Colors.axisColorProperty,
    });
    const powerFill = new Path(null, { fill: Colors.rangeBandColorProperty, stroke: Colors.guideColorProperty });
    const powerCurve = new Path(null, {
      stroke: Colors.outputTraceColorProperty,
      lineWidth: CHART_SETTINGS.TRACE_WIDTH,
    });
    const insetTitle = instrumentText(strings.powerTitleStringProperty, captionOptions);
    const powerGain = instrumentText(strings.powerGainStringProperty, {
      ...captionOptions,
      rotation: -Math.PI / 2,
      maxWidth: insetHeight + CHART_SETTINGS.LABEL_SIZE,
    });
    const powerPlot = new Node({ children: [insetBorder, powerFill, powerCurve] });
    const horizontalAxis = new VBox({ children: [powerPlot, powerFrequency], spacing: gap / 2 });
    const insetBody = new HBox({ children: [powerGain, horizontalAxis, caption], spacing: gap });
    const inset = new VBox({
      children: [insetTitle, insetBody],
      align: "left",
      spacing: gap / 2,
      left: 2 * gap,
      bottom: settings.BOTTOM_HEIGHT - gap,
    });
    this.addChild(inset);
    this.plot.children = [response, cutoff, dot, cutoffLabel];
    this.bag.own(
      powerFrequencyProperty,
      bandwidthProperty,
      response,
      cutoff,
      dot,
      cutoffLabel,
      insetBorder,
      powerFill,
      powerCurve,
      insetTitle,
      powerGain,
      powerFrequency,
      powerArea,
      powerWidth,
      caption,
      powerPlot,
      horizontalAxis,
      insetBody,
      inset,
    );
    const draw = (): void => {
      const tau = model.timeConstantProperty.value;
      const order = model.orderProperty.value as FilterOrder;
      const curve = new Shape();
      const power = new Shape();
      const bandwidth = model.enbwProperty.value;
      // Here 0 ≤ f ≤ 1/τ is linear. Unit height and width ENBW give the same
      // integral as the complete power curve, including its tail beyond the inset.
      powerFill.shape = new Shape().rect(0, 0, insetWidth * bandwidth * tau, insetHeight);
      for (let index = 0; index <= settings.RESPONSE_POINTS; index++) {
        const u = index / settings.RESPONSE_POINTS;
        const logF = low + (high - low) * u;
        const db = 20 * Math.log10(magnitude(10 ** logF, tau, order));
        const x = this.chartTransform.modelToViewX(logF);
        const y = this.chartTransform.modelToViewY(Math.max(bottom - 1, db));
        const powerX = u * insetWidth;
        const powerY = insetHeight * (1 - magnitude(u / tau, tau, order) ** 2);
        if (index === 0) {
          curve.moveTo(x, y);
          power.moveTo(powerX, powerY);
        } else {
          curve.lineTo(x, y);
          power.lineTo(powerX, powerY);
        }
      }
      response.shape = curve;
      powerCurve.shape = power;
      const x = this.chartTransform.modelToViewX(Math.log10(cutoff3dB(tau, order)));
      const y = this.chartTransform.modelToViewY(10 * Math.log10(0.5));
      cutoff.shape = new Shape().moveTo(x, y).lineTo(x, this.plotHeight);
      dot.shape = new Shape().circle(x, y, settings.MARKER_SIZE);
      cutoffLabel.right = x - CHART_SETTINGS.AXIS_LABEL_GAP;
      cutoffLabel.top = y + CHART_SETTINGS.AXIS_LABEL_GAP;
    };
    this.bag.link(model.timeConstantProperty, draw);
    this.bag.lazyLink(model.orderProperty, draw);
  }
}

export class NoiseScalingPlot extends ChartFrame {
  public constructor(model: FilteringModel, width: number) {
    super({
      width,
      height: settings.BOTTOM_HEIGHT,
      title: strings.scalingStringProperty,
      xTitle: strings.tauAxisStringProperty,
      yUnit: strings.sigmaAxisStringProperty,
      accessibleDescription: a11y.scalingStringProperty,
    });
    const orders = Object.values(FILTER_SETTINGS.ORDERS);
    const captions = orders.map((order) => {
      const captionProperty = new DerivedProperty([strings.orderMarkerStringProperty], (pattern) =>
        formatValue(pattern, order, 0),
      );
      const caption = instrumentText(captionProperty, { font: chartLabelFont, fill: orderColors[order] });
      this.bag.own(captionProperty, caption);
      return caption;
    });
    const legend = new HBox({
      children: captions,
      spacing: CHART_SETTINGS.AXIS_LABEL_GAP * 2,
      top: CHART_SETTINGS.AXIS_LABEL_GAP * 2,
      right: this.plotWidth - CHART_SETTINGS.AXIS_LABEL_GAP * 2,
    });
    const curves = orders.map((order) => {
      const color = orderColors[order];
      const line = new Path(null, { stroke: color, lineWidth: frameWidth });
      const points = new Path(null, { fill: color });
      this.plot.addChild(line);
      this.plot.addChild(points);
      this.bag.own(line, points);
      return { order, line, points };
    });
    this.plot.addChild(legend);
    this.bag.own(legend);
    const [firstTau] = FILTER_SETTINGS.TIME_CONSTANTS;
    const lastTau = Math.max(...FILTER_SETTINGS.TIME_CONSTANTS);
    const x = new Range(Math.log10(firstTau) - 0.05, Math.log10(lastTau) + 0.05);
    const draw = (): void => {
      const density = model.densityProperty.value;
      const measurements = model.measurementsProperty.value;
      const low = Math.min(
        settings.NOISE_DECADES[0],
        ...measurements.filter(({ sigma }) => sigma > 0).map(({ sigma }) => sigma),
      );
      const high = Math.max(
        Math.max(...settings.NOISE_DECADES),
        ...measurements.map(({ sigma }) => sigma),
        predictedOutputNoise(density, firstTau, 1),
      );
      const logLow = Math.floor(Math.log10(low));
      const logHigh = Math.log10(high);
      this.setAxes(
        x,
        new Range(logLow - 0.12, logHigh + 0.12),
        xTicks(
          settings.TAU_DECADES_MS.map((value) => value / 1000),
          1000,
        ),
        xTicks(
          Array.from({ length: Math.floor(logHigh) - logLow + 1 }, (_, index) => 10 ** (logLow + index)),
          1000,
        ),
      );
      for (const { order, line, points } of curves) {
        line.shape =
          density > 0
            ? new Shape()
                .moveTo(
                  this.chartTransform.modelToViewX(Math.log10(firstTau)),
                  this.chartTransform.modelToViewY(Math.log10(predictedOutputNoise(density, firstTau, order))),
                )
                .lineTo(
                  this.chartTransform.modelToViewX(Math.log10(lastTau)),
                  this.chartTransform.modelToViewY(Math.log10(predictedOutputNoise(density, lastTau, order))),
                )
            : null;
        const marks = new Shape();
        for (const { tau, n, sigma } of measurements) {
          if (n === order && sigma > 0) {
            marks.circle(
              this.chartTransform.modelToViewX(Math.log10(tau)),
              this.chartTransform.modelToViewY(Math.log10(sigma)),
              settings.MARKER_SIZE,
            );
          }
        }
        points.shape = marks;
      }
    };
    this.bag.link(model.measurementsProperty, draw);
    this.bag.lazyLink(model.densityProperty, draw);
  }
}
