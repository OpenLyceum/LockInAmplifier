/** RC notebook plots in log frequency, using recorded measurements only. */
import { NumberProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HBox, Path, type TColor } from "scenerystack/scenery";
import { ChartFrame } from "../../common/view/ChartFrame.js";
import { instrumentText } from "../../common/view/instrumentText.js";
import Colors from "../../LockInAmplifierColors.js";
import { LAB_INSTRUMENT_SETTINGS, LAB_LAYOUT_SETTINGS as layout } from "../../LockInAmplifierConstants.js";
import type { LabRow } from "../model/VirtualExperimentModel.js";
import { lab, labA11y, labLabelFont } from "./labText.js";

const degreesPerRadian = 180 / Math.PI;
const inputRange = new Range(...LAB_INSTRUMENT_SETTINGS.REFERENCE_RANGE);
const logRange = new Range(Math.log10(inputRange.min), Math.log10(inputRange.max));
const frequencyTicks = [1, 10, 100, 1000, inputRange.max].map((f) => ({ value: Math.log10(f), label: String(f) }));
const responseRows = (rows: readonly LabRow[]) =>
  rows
    .filter((row) => row.scenario === "rcFilter" && !row.clipped && row.harmonic === 1)
    .sort((a, b) => a.frequency - b.frequency);

export class ResponsePlot extends ChartFrame {
  private readonly pointCountProperty: NumberProperty;
  private readonly points: Path;
  private readonly guide: Path;
  private readonly emptyMessage;

  public constructor(width: number, title: TReadOnlyProperty<string>, yUnit: TReadOnlyProperty<string>, color: TColor) {
    const pointCountProperty = new NumberProperty(0);
    const descriptionProperty = new PatternStringProperty(labA11y.responsePlotStringProperty, {
      quantity: title,
      count: pointCountProperty,
    });
    super({
      width,
      height: layout.RESPONSE_HEIGHT,
      title,
      xTitle: lab.frequencyAxisStringProperty,
      yUnit,
      compact: true,
      accessibleDescription: descriptionProperty,
    });
    this.pointCountProperty = pointCountProperty;
    this.bag.own(pointCountProperty, descriptionProperty);
    this.guide = new Path(null, { stroke: Colors.guideColorProperty, lineDash: [4, 4] });
    this.points = new Path(null, { stroke: color, fill: color });
    this.emptyMessage = instrumentText(lab.responseWaitingStringProperty, {
      font: labLabelFont,
      fill: Colors.mutedTextColorProperty,
      centerX: this.plotWidth / 2,
      centerY: this.plotHeight / 2,
      maxWidth: this.plotWidth - layout.INSET,
    });
    this.plot.addChild(this.guide);
    this.plot.addChild(this.points);
    this.plot.addChild(this.emptyMessage);
    this.bag.own(this.guide, this.points, this.emptyMessage);
  }

  public draw(rows: readonly LabRow[], angle: boolean): void {
    this.pointCountProperty.value = rows.length;
    const extended = rows.some((row) => row.theta > 0 || row.theta < -Math.PI / 2);
    const ticks = angle ? (extended ? [-180, -90, -45, 0, 90, 180] : [-90, -45, 0]) : [0, 0.5, 1];
    this.setAxes(
      logRange,
      angle
        ? extended
          ? new Range(-180, 180)
          : new Range(-90, 0)
        : new Range(0, LAB_INSTRUMENT_SETTINGS.RESPONSE_MAGNITUDE_LIMIT),
      frequencyTicks,
      ticks.map((value) => ({ value, label: String(value) })),
    );
    if (angle && rows.length > 0) {
      const y = this.chartTransform.modelToViewY(-45);
      this.guide.shape = new Shape().moveTo(0, y).lineTo(this.plotWidth, y);
    } else {
      this.guide.shape = null;
    }
    const shape = new Shape();
    for (const row of rows) {
      const x = this.chartTransform.modelToViewX(Math.log10(row.frequency));
      const y = this.chartTransform.modelToViewY(angle ? row.theta * degreesPerRadian : row.r);
      shape.newSubpath().circle(x, y, layout.INDICATOR_RADIUS / 2);
    }
    this.points.shape = shape;
    this.emptyMessage.visible = rows.length === 0;
  }
}

export class LabResponsePlots extends HBox {
  public constructor(rows: TReadOnlyProperty<readonly LabRow[]>, width: number) {
    const halfWidth = (width - layout.COMPACT_GAP) / 2;
    const r = new ResponsePlot(
      halfWidth,
      lab.responseRStringProperty,
      lab.headerRStringProperty,
      Colors.outputTraceColorProperty,
    );
    const theta = new ResponsePlot(
      halfWidth,
      lab.responseThetaStringProperty,
      lab.headerThetaStringProperty,
      Colors.quadratureTraceColorProperty,
    );
    super({ spacing: layout.COMPACT_GAP, children: [r, theta] });
    const update = (entries: readonly LabRow[]) => {
      const points = responseRows(entries);
      r.draw(points, false);
      theta.draw(points, true);
    };
    rows.link(update);
    this.disposeEmitter.addListener(() => {
      rows.unlink(update);
      r.dispose();
      theta.dispose();
    });
  }
}
