/** Fixed chart geometry, reusable axes and a clipped plotting layer in bamboo coordinates. */
import type { TReadOnlyProperty } from "scenerystack/axon";
import { ChartTransform } from "scenerystack/bamboo";
import { Bounds2, type Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle, type TColor, type Text } from "scenerystack/scenery";
import Colors from "../../LockInAmplifierColors.js";
import { PANEL_CORNER_RADIUS, CHART_SETTINGS as settings } from "../../LockInAmplifierConstants.js";
import { DisposalBag } from "./DisposalBag.js";
import { chartLabelFont, chartTitleFont, instrumentText } from "./instrumentText.js";

type FrameOptions = {
  width: number;
  height: number;
  title: TReadOnlyProperty<string>;
  xTitle?: TReadOnlyProperty<string>;
  yUnit?: TReadOnlyProperty<string>;
  showYTicks?: boolean;
  plotLeft?: number;
  accessibleDescription?: TReadOnlyProperty<string>;
  compact?: boolean;
  showXAxis?: boolean;
};

type Tick = { value: number; label: string };

export class ChartFrame extends Node {
  protected readonly bag = new DisposalBag();
  protected readonly chartTransform: ChartTransform;
  protected readonly plot: Node;
  protected readonly titleNode: Text;
  protected readonly header: Node;
  protected readonly plotWidth: number;
  protected readonly plotHeight: number;

  private readonly backing: Rectangle;
  private readonly grid: Path;
  private readonly xLabels: Node;
  private readonly yLabels: Node;
  private readonly chartLeft: number;
  private readonly chartTop: number;

  public constructor(options: FrameOptions) {
    super({
      pickable: false,
      ...(options.accessibleDescription ? { accessibleParagraph: options.accessibleDescription } : {}),
    });
    this.chartLeft = options.plotLeft ?? settings.LEFT;
    this.chartTop = options.compact ? settings.COMPACT_TOP : settings.TOP;
    const bottom = options.showXAxis === false ? settings.COMPACT_BOTTOM : settings.BOTTOM;
    this.plotWidth = options.width - this.chartLeft - settings.RIGHT;
    this.plotHeight = options.height - this.chartTop - bottom;
    this.chartTransform = new ChartTransform({ viewWidth: this.plotWidth, viewHeight: this.plotHeight });
    this.bag.own(this.chartTransform);
    this.backing = new Rectangle(0, 0, options.width, options.height, {
      cornerRadius: PANEL_CORNER_RADIUS,
      fill: Colors.chartBackgroundColorProperty,
      stroke: Colors.chartBorderColorProperty,
    });
    this.titleNode = instrumentText(options.title, {
      font: chartTitleFont,
      left: this.chartLeft,
      centerY: this.chartTop / 2,
      maxWidth: this.plotWidth,
    });
    const yUnit = options.yUnit
      ? instrumentText(options.yUnit, {
          font: chartLabelFont,
          fill: Colors.mutedTextColorProperty,
          rotation: -Math.PI / 2,
          left: settings.AXIS_LABEL_GAP,
          centerY: this.chartTop + this.plotHeight / 2,
          maxWidth: this.plotHeight,
        })
      : null;
    this.header = new Node();
    this.grid = new Path(null, { stroke: Colors.gridColorProperty, lineWidth: settings.GRID_WIDTH });
    this.plot = new Node({ clipArea: Shape.bounds(new Bounds2(0, 0, this.plotWidth, this.plotHeight)) });
    this.xLabels = new Node();
    this.yLabels = new Node({ visible: options.showYTicks !== false });
    const positionedPlot = new Node({
      x: this.chartLeft,
      y: this.chartTop,
      children: [this.grid, this.plot, this.xLabels, this.yLabels],
    });
    this.children = [this.backing, positionedPlot, ...(yUnit ? [yUnit] : []), this.titleNode, this.header];
    if (yUnit) {
      this.bag.own(yUnit);
    }
    this.bag.own(
      this.backing,
      this.titleNode,
      positionedPlot,
      this.plot,
      this.grid,
      this.xLabels,
      this.yLabels,
      this.header,
    );

    if (options.xTitle && options.showXAxis !== false) {
      const xTitle = instrumentText(options.xTitle, {
        font: chartLabelFont,
        fill: Colors.mutedTextColorProperty,
        centerX: this.chartLeft + this.plotWidth / 2,
        bottom: options.height - settings.AXIS_LABEL_GAP,
      });
      this.addChild(xTitle);
      this.bag.own(xTitle);
    }
  }

  /** Select the card corresponding to the active probe. */
  public setHighlighted(highlighted: boolean, color: TColor): void {
    this.backing.stroke = highlighted ? color : Colors.chartBorderColorProperty;
    this.titleNode.fill = highlighted ? color : Colors.textColorProperty;
  }

  /** Rebuild ticks when the displayed range changes. */
  protected setAxes(
    xRange: Range,
    yRange: Range,
    xTicks: readonly Tick[],
    yTicks: readonly Tick[],
    showX = true,
  ): void {
    this.chartTransform.setModelXRange(xRange);
    this.chartTransform.setModelYRange(yRange);
    this.disposeLabels();
    const grid = new Shape().rect(0, 0, this.plotWidth, this.plotHeight);
    for (const tick of xTicks) {
      const x = this.chartTransform.modelToViewX(tick.value);
      grid.moveTo(x, 0).lineTo(x, this.plotHeight);
      if (showX) {
        this.xLabels.addChild(
          instrumentText(tick.label, {
            font: chartLabelFont,
            fill: Colors.mutedTextColorProperty,
            centerX: x,
            top: this.plotHeight + settings.AXIS_LABEL_GAP,
          }),
        );
      }
    }
    for (const tick of yTicks) {
      const y = this.chartTransform.modelToViewY(tick.value);
      grid.moveTo(0, y).lineTo(this.plotWidth, y);
      this.yLabels.addChild(
        instrumentText(tick.label, {
          font: chartLabelFont,
          fill: Colors.mutedTextColorProperty,
          right: -settings.AXIS_LABEL_GAP,
          centerY: y,
        }),
      );
    }
    this.grid.shape = grid;
  }

  private disposeLabels(): void {
    for (const label of [...this.xLabels.children, ...this.yLabels.children]) {
      label.dispose();
    }
  }

  public override dispose(): void {
    this.disposeLabels();
    this.bag.dispose();
    super.dispose();
  }
}
