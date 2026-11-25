/** Equal-aspect X–Y plane with a time-faded output history. */
import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Path } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import { formatTickValue, hystereticSpan } from "../../common/view/axisScale.js";
import { ChartFrame } from "../../common/view/ChartFrame.js";
import { chartLabelFont, instrumentStrings, instrumentText } from "../../common/view/instrumentText.js";
import { StringManager } from "../../i18n/StringManager.js";
import Colors from "../../LockInAmplifierColors.js";
import {
  CHART_SETTINGS as chart,
  SAMPLING_SETTINGS,
  PHASE_SETTINGS as settings,
} from "../../LockInAmplifierConstants.js";
import type { PhaseDetectionModel } from "../model/PhaseDetectionModel.js";

const { phase: strings } = instrumentStrings;
const a11y = StringManager.getInstance().getPhaseDetectionA11yStrings();

export class PhasorPlane extends ChartFrame {
  private readonly trail;
  private readonly axes = new Path(null, { stroke: Colors.axisColorProperty });
  private readonly projections = new Path(null, {
    stroke: Colors.axisColorProperty,
    lineDash: [...chart.DASH],
  });
  private readonly arc = new Path(null, { stroke: Colors.quadratureTraceColorProperty, lineWidth: chart.GUIDE_WIDTH });
  private readonly arcLabel = instrumentText(strings.thetaStringProperty, {
    font: chartLabelFont,
    fill: Colors.quadratureTraceColorProperty,
  });
  private readonly arrow = new ArrowNode(0, 0, 0, 0, {
    tailWidth: chart.GUIDE_WIDTH,
    headWidth: settings.ARROW_HEAD,
    headHeight: settings.ARROW_HEAD,
    isHeadDynamic: true,
    fill: Colors.productTraceColorProperty,
    stroke: null,
  });
  private readonly dot = new Path(null, { fill: Colors.outputTraceColorProperty });
  private readonly yLabel;
  private readonly projectedX = new Path(null, { fill: Colors.outputTraceColorProperty });
  private readonly projectedY = new Path(null, { fill: Colors.quadratureTraceColorProperty });
  private span = 0;
  private lastDual = false;
  private elapsed = Infinity;

  private readonly model: PhaseDetectionModel;
  private readonly dual: TReadOnlyProperty<boolean>;

  public constructor(model: PhaseDetectionModel, dual: TReadOnlyProperty<boolean>) {
    const size = settings.PLANE_HEIGHT - chart.TOP - chart.BOTTOM;
    const titleProperty = new DerivedProperty(
      [dual, strings.planeStringProperty, strings.singlePlaneStringProperty],
      (showPhasor, plane, single) => (showPhasor ? plane : single),
    );
    super({
      width: size + chart.LEFT + chart.RIGHT,
      height: settings.PLANE_HEIGHT,
      title: titleProperty,
      accessibleDescription: a11y.planeStringProperty,
      xTitle: strings.xAxisStringProperty,
    });
    this.model = model;
    this.dual = dual;
    this.yLabel = instrumentText(strings.yAxisStringProperty, {
      font: chartLabelFont,
      fill: Colors.mutedTextColorProperty,
      rotation: -Math.PI / 2,
      centerY: chart.TOP + size / 2,
      left: chart.AXIS_LABEL_GAP,
    });
    this.addChild(this.yLabel);
    this.trail = Array.from(
      { length: settings.TRAIL_LAYERS },
      (_, index) =>
        new Path(null, { fill: Colors.outputTraceColorProperty, opacity: (index + 1) / (settings.TRAIL_LAYERS + 1) }),
    );
    this.plot.children = [
      this.axes,
      ...this.trail,
      this.projections,
      this.projectedX,
      this.projectedY,
      this.arc,
      this.arcLabel,
      this.arrow,
      this.dot,
    ];
    this.bag.own(
      titleProperty,
      this.axes,
      ...this.trail,
      this.projections,
      this.projectedX,
      this.projectedY,
      this.arc,
      this.arcLabel,
      this.arrow,
      this.dot,
      this.yLabel,
    );
  }

  public step(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < 1 / chart.SCOPE_REDRAW_HZ) {
      return;
    }
    this.elapsed = 0;
    const dual = this.dual.value;
    const y = dual ? this.model.yProperty.value : 0;
    const x = this.model.xProperty.value;
    const minSpan = this.model.amplitudeProperty.value;
    const span = hystereticSpan(this.span, Math.max(minSpan, Math.abs(x), Math.abs(y)));
    if (span !== this.span || dual !== this.lastDual) {
      this.span = span;
      this.lastDual = dual;
      const limit = span * chart.SCALE_HEADROOM;
      const ticks = [-span, -span / 2, 0, span / 2, span].map((value) => ({
        value,
        label: formatTickValue(value, span / 2),
      }));
      this.setAxes(new Range(-limit, limit), new Range(-limit, limit), ticks, dual ? ticks : []);
    }
    const cx = this.chartTransform.modelToViewX(0);
    const cy = this.chartTransform.modelToViewY(0);
    const px = this.chartTransform.modelToViewX(x);
    const py = this.chartTransform.modelToViewY(y);
    const axes = new Shape().moveTo(0, cy).lineTo(this.plotWidth, cy);
    if (dual) {
      axes.moveTo(cx, 0).lineTo(cx, this.plotHeight);
    }
    this.axes.shape = axes;
    this.yLabel.visible = dual;
    this.projections.shape = dual ? new Shape().moveTo(px, cy).lineTo(px, py).lineTo(cx, py) : null;
    this.projectedX.shape = dual ? new Shape().circle(px, cy, settings.TRAIL_DOT_RADIUS * 2) : null;
    this.projectedY.shape = dual ? new Shape().circle(cx, py, settings.TRAIL_DOT_RADIUS * 2) : null;
    this.arrow.visible = dual;
    this.arrow.setTailAndTip(cx, cy, px, py);
    this.dot.shape = new Shape().circle(px, py, settings.TRAIL_DOT_RADIUS * 2);
    const angle = -this.model.thetaProperty.value;
    const radius = settings.ANGLE_ARC_RADIUS;
    this.arc.shape =
      dual && Math.hypot(px - cx, py - cy) > radius ? new Shape().arc(cx, cy, radius, 0, angle, angle < 0) : null;
    this.arcLabel.visible = this.arc.shape !== null && Math.abs(angle) > settings.PHASE_STEP;
    this.arcLabel.centerX = cx + (radius + chart.LABEL_SIZE) * Math.cos(angle / 2);
    this.arcLabel.centerY = cy + (radius + chart.LABEL_SIZE) * Math.sin(angle / 2);
    this.drawTrail(dual);
  }

  private drawTrail(dual: boolean): void {
    const count = this.model.xTrail.length;
    const layerLength = (SAMPLING_SETTINGS.STRIP_RATE * settings.TRAIL_SECONDS) / this.trail.length;
    const stride = SAMPLING_SETTINGS.STRIP_RATE / settings.TRAIL_POINTS_PER_SECOND;
    this.trail.forEach((path, index) => {
      const start = Math.floor(layerLength * (this.trail.length - index - 1));
      const end = Math.min(count, Math.floor(start + layerLength));
      const shape = new Shape();
      for (let age = start; age < end; age += stride) {
        const x = this.chartTransform.modelToViewX(this.model.xTrail.atAge(age));
        const y = this.chartTransform.modelToViewY(dual ? this.model.yTrail.atAge(age) : 0);
        shape.circle(x, y, settings.TRAIL_DOT_RADIUS);
      }
      path.shape = shape;
    });
  }
}
